"""Documents and revisions."""
import uuid

from flask import Blueprint, g, jsonify, request

from email_notifications import (
    send_revision_approved_email,
    send_revision_pending_email,
    send_revision_rejected_email,
)
from helpers import format_document, format_revision, log_audit, require_auth
from models import Document, PrintTransaction, Revision, User, db, utcnow

bp = Blueprint("documents", __name__)

APPROVER_ROLES = ("administrator", "document_controller", "supervisor", "manager")
STAGE1_APPROVER_ROLES = ("administrator", "document_controller", "supervisor")
FINAL_APPROVER_ROLES = ("administrator", "manager")


@bp.get("/documents")
@require_auth()
def list_documents():
    q = Document.query
    if request.args.get("search"):
        s = f"%{request.args['search']}%"
        q = q.filter(db.or_(Document.title.ilike(s), Document.document_number.ilike(s),
                            Document.description.ilike(s)))
    if request.args.get("status"):
        q = q.filter(Document.status == request.args["status"])
    if request.args.get("category"):
        q = q.filter(Document.category_id == int(request.args["category"]))
    if request.args.get("department"):
        q = q.filter(Document.department_id == int(request.args["department"]))
    page = max(1, request.args.get("page", 1, type=int))
    limit = min(100, max(1, request.args.get("limit", 20, type=int)))
    total = q.count()
    docs = q.order_by(Document.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return jsonify({"data": [format_document(d) for d in docs],
                    "total": total, "page": page, "limit": limit})


@bp.post("/documents")
@require_auth()
def create_document():
    body = request.get_json(silent=True) or {}
    if not body.get("documentNumber") or not body.get("title"):
        return jsonify({"error": "documentNumber and title are required"}), 400
    if Document.query.filter_by(document_number=body["documentNumber"]).first():
        return jsonify({"error": "Document number already exists"}), 400
    doc = Document(document_number=body["documentNumber"], title=body["title"],
                   category_id=body.get("categoryId"), department_id=body.get("departmentId"),
                   description=body.get("description"), created_by=g.user.id)
    db.session.add(doc)
    db.session.commit()
    log_audit(g.user.id, "CREATE_DOCUMENT", "documents",
              f"Created document {doc.document_number}", "document", doc.id)
    return jsonify(format_document(doc)), 201


@bp.get("/documents/<int:doc_id>")
@require_auth()
def get_document(doc_id):
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    current = db.session.get(Revision, doc.current_revision_id) if doc.current_revision_id else None
    print_count = PrintTransaction.query.filter_by(document_id=doc.id).count()
    log_audit(g.user.id, "VIEW_DOCUMENT", "documents",
              f"Viewed document {doc.document_number}", "document", doc.id)
    result = format_document(doc)
    result["currentRevision"] = format_revision(current) if current else None
    result["printCount"] = print_count
    return jsonify(result)


@bp.patch("/documents/<int:doc_id>")
@require_auth()
def update_document(doc_id):
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    body = request.get_json(silent=True) or {}
    for key, attr in (("title", "title"), ("categoryId", "category_id"),
                      ("departmentId", "department_id"), ("description", "description")):
        if key in body:
            setattr(doc, attr, body[key])
    db.session.commit()
    return jsonify(format_document(doc))


# ---------- Revisions ----------

@bp.get("/documents/<int:doc_id>/revisions")
@require_auth()
def list_revisions(doc_id):
    revs = Revision.query.filter_by(document_id=doc_id).order_by(Revision.created_at.asc()).all()
    return jsonify([format_revision(r) for r in revs])


@bp.post("/documents/<int:doc_id>/revisions")
@require_auth()
def create_revision(doc_id):
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    body = request.get_json(silent=True) or {}
    for f in ("revisionNumber", "filePath", "fileName"):
        if not body.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    rev = Revision(document_id=doc_id, revision_number=body["revisionNumber"],
                   file_path=body["filePath"], file_name=body["fileName"],
                   effective_date=body.get("effectiveDate"), status="draft",
                   uploaded_by=g.user.id)
    doc.status = "draft"
    db.session.add(rev)
    db.session.commit()
    log_audit(g.user.id, "UPLOAD_REVISION", "revisions",
              f"Uploaded revision {rev.revision_number} for {doc.document_number}",
              "revision", rev.id)
    return jsonify(format_revision(rev)), 201


def _get_doc_rev(doc_id, rev_id):
    doc = db.session.get(Document, doc_id)
    rev = db.session.get(Revision, rev_id)
    if not doc or not rev or rev.document_id != doc_id:
        return None, None
    return doc, rev


@bp.post("/documents/<int:doc_id>/revisions/<int:rev_id>/submit")
@require_auth()
def submit_revision(doc_id, rev_id):
    doc, rev = _get_doc_rev(doc_id, rev_id)
    if not rev:
        return jsonify({"error": "Revision not found"}), 404
    # The frontend's approve/reject controls appear for "under_review"
    rev.status = "under_review"
    doc.status = "under_review"
    db.session.commit()

    approvers = User.query.filter_by(role="supervisor", status="active").all()
    send_revision_pending_email(g.user, approvers, doc.document_number, rev.revision_number)

    log_audit(g.user.id, "SUBMIT_REVISION", "revisions",
              f"Submitted revision {rev.revision_number} of {doc.document_number}",
              "revision", rev.id)
    return jsonify(format_revision(rev))


@bp.post("/documents/<int:doc_id>/revisions/<int:rev_id>/approve")
@require_auth(APPROVER_ROLES)
def approve_revision(doc_id, rev_id):
    doc, rev = _get_doc_rev(doc_id, rev_id)
    if not rev:
        return jsonify({"error": "Revision not found"}), 404
    body = request.get_json(silent=True) or {}

    # Two-stage approval:
    #   under_review   -> supervisor/DC approves  -> manager_review
    #   manager_review -> manager gives FINAL approval -> approved (+ QR)
    if rev.status == "under_review":
        if g.user.role not in STAGE1_APPROVER_ROLES:
            return jsonify({"error": "Only a supervisor, document controller, or administrator can approve this stage"}), 403
        rev.status = "manager_review"
        rev.approval_comments = body.get("comments")
        doc.status = "manager_review"
        db.session.commit()

        managers = User.query.filter_by(role="manager", status="active").all()
        if managers:
            send_revision_pending_email(rev.uploader, managers, doc.document_number, rev.revision_number)

        log_audit(g.user.id, "SUPERVISOR_APPROVE_REVISION", "revisions",
                  f"Supervisor-approved revision {rev.revision_number} of {doc.document_number}; awaiting manager final approval",
                  "revision", rev.id)
        return jsonify(format_revision(rev))

    if rev.status == "manager_review":
        if g.user.role not in FINAL_APPROVER_ROLES:
            return jsonify({"error": "Only a manager or administrator can give final approval"}), 403
        rev.status = "approved"
        rev.approved_by = g.user.id
        rev.approval_date = utcnow()
        if body.get("comments"):
            rev.approval_comments = body["comments"]
        if body.get("effectiveDate"):
            rev.effective_date = body["effectiveDate"]
        rev.qr_token = uuid.uuid4().hex  # 32-char token, same as original
        # Obsolete all other approved revisions of this document
        Revision.query.filter(Revision.document_id == doc_id, Revision.id != rev_id,
                              Revision.status == "approved").update({"status": "obsolete"})
        doc.current_revision_id = rev.id
        doc.status = "approved"
        db.session.commit()

        approver_name = g.user.full_name or g.user.employee_id or "Manager"
        send_revision_approved_email(rev.uploader, doc.document_number, rev.revision_number, approver_name)

        log_audit(g.user.id, "APPROVE_REVISION", "revisions",
                  f"Final-approved revision {rev.revision_number} of {doc.document_number}",
                  "revision", rev.id)
        return jsonify(format_revision(rev))

    return jsonify({"error": f"Revision is not awaiting approval (status: {rev.status})"}), 400


@bp.post("/documents/<int:doc_id>/revisions/<int:rev_id>/reject")
@require_auth(APPROVER_ROLES)
def reject_revision(doc_id, rev_id):
    doc, rev = _get_doc_rev(doc_id, rev_id)
    if not rev:
        return jsonify({"error": "Revision not found"}), 404
    body = request.get_json(silent=True) or {}
    if not body.get("reason"):
        return jsonify({"error": "reason is required"}), 400
    # Only pending revisions can be rejected, and only by the stage's approvers
    if rev.status == "under_review":
        if g.user.role not in STAGE1_APPROVER_ROLES:
            return jsonify({"error": "Only a supervisor, document controller, or administrator can reject this stage"}), 403
    elif rev.status == "manager_review":
        if g.user.role not in FINAL_APPROVER_ROLES:
            return jsonify({"error": "Only a manager or administrator can reject at final approval"}), 403
    else:
        return jsonify({"error": f"Revision is not awaiting approval (status: {rev.status})"}), 400
    rev.status = "rejected"
    rev.approved_by = g.user.id
    rev.approval_date = utcnow()
    rev.rejection_reason = body["reason"]
    # Keep the document approved if it still has a valid current revision
    current = Revision.query.get(doc.current_revision_id) if doc.current_revision_id else None
    doc.status = "approved" if (current and current.status == "approved") else "rejected"
    db.session.commit()

    approver_name = g.user.full_name or g.user.employee_id or "Supervisor"
    send_revision_rejected_email(rev.uploader, doc.document_number, rev.revision_number, approver_name, body["reason"])

    log_audit(g.user.id, "REJECT_REVISION", "revisions",
              f"Rejected revision {rev.revision_number} of {doc.document_number}",
              "revision", rev.id)
    return jsonify(format_revision(rev))
