"""Document requests."""
import time

from flask import Blueprint, g, jsonify, request

from helpers import iso, log_audit, require_auth
from models import DocumentRequest, db, utcnow

bp = Blueprint("requests", __name__)

APPROVER_ROLES = ("administrator", "document_controller", "supervisor")


def _fmt(r):
    return {
        "id": r.id,
        "requestNumber": r.request_number,
        "documentId": r.document_id,
        "documentNumber": r.document.document_number if r.document else None,
        "documentTitle": r.document.title if r.document else None,
        "revisionId": r.revision_id,
        "revisionNumber": r.revision.revision_number if r.revision else None,
        "requestedByName": r.requester.full_name if r.requester else None,
        "purpose": r.purpose,
        "status": r.status,
        "requestedAt": iso(r.requested_at),
        "approvedAt": iso(r.approved_at),
    }


@bp.get("/requests")
@require_auth()
def list_requests():
    rows = DocumentRequest.query.order_by(DocumentRequest.id.desc()).all()
    if request.args.get("status"):
        rows = [r for r in rows if r.status == request.args["status"]]
    if request.args.get("mine") == "true":
        rows = [r for r in rows if r.requested_by == g.user.id]
    # The frontend reads response.data, so wrap the list
    return jsonify({"data": [_fmt(r) for r in rows]})


@bp.post("/requests")
@require_auth()
def create_request():
    body = request.get_json(silent=True) or {}
    if not body.get("documentId") or not body.get("revisionId"):
        return jsonify({"error": "documentId and revisionId are required"}), 400
    req = DocumentRequest(
        request_number=f"REQ-{int(time.time() * 1000)}",
        document_id=body["documentId"],
        revision_id=body["revisionId"],
        requested_by=g.user.id,
        purpose=body.get("purpose"),
        number_of_copies=body.get("numberOfCopies", 1),
        status="pending",
    )
    db.session.add(req)
    db.session.commit()
    log_audit(g.user.id, "CREATE_REQUEST", "requests",
              f"Created request {req.request_number}", "request", req.id)
    return jsonify(_fmt(req)), 201


@bp.post("/requests/<int:req_id>/approve")
@require_auth(APPROVER_ROLES)
def approve_request(req_id):
    req = db.session.get(DocumentRequest, req_id)
    if not req:
        return jsonify({"error": "Request not found"}), 404
    req.status = "approved"
    req.approved_at = utcnow()
    db.session.commit()
    log_audit(g.user.id, "APPROVE_REQUEST", "requests",
              f"Approved request {req.request_number}", "request", req.id)
    return jsonify(_fmt(req))


@bp.post("/requests/<int:req_id>/reject")
@require_auth(APPROVER_ROLES)
def reject_request(req_id):
    req = db.session.get(DocumentRequest, req_id)
    if not req:
        return jsonify({"error": "Request not found"}), 404
    body = request.get_json(silent=True) or {}
    req.status = "rejected"
    req.rejection_reason = body.get("reason")
    db.session.commit()
    log_audit(g.user.id, "REJECT_REQUEST", "requests",
              f"Rejected request {req.request_number}", "request", req.id)
    return jsonify(_fmt(req))
