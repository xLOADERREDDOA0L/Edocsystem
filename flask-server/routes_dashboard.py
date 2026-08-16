"""Dashboard stats, audit logs, and reports."""
from datetime import datetime, timedelta, timezone

from flask import Blueprint, g, jsonify, request

from helpers import iso, require_auth
from models import (AuditLog, Category, Department, Document, PrintTransaction,
                    Revision, User, db)

bp = Blueprint("dashboard", __name__)

REPORT_ROLES = ("administrator", "document_controller", "supervisor", "manager")
AUDIT_ROLES = ("administrator", "document_controller")


def _today_start():
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


@bp.get("/dashboard/stats")
@require_auth()
def stats():
    from models import DocumentRequest
    today = _today_start()
    return jsonify({
        "totalDocuments": Document.query.count(),
        "approvedDocuments": Document.query.filter_by(status="approved").count(),
        "pendingApprovals": Revision.query.filter(
            Revision.status.in_(["under_review", "manager_review"])).count(),
        "obsoleteDocuments": Document.query.filter_by(status="obsolete").count(),
        "todayPrints": PrintTransaction.query.filter(PrintTransaction.printed_at >= today).count(),
        "todayRequests": DocumentRequest.query.filter(DocumentRequest.requested_at >= today).count(),
        "totalUsers": User.query.count(),
        "totalPrintTransactions": PrintTransaction.query.count(),
    })


@bp.get("/dashboard/recent-activity")
@require_auth()
def recent_activity():
    limit = request.args.get("limit", 20, type=int)
    logs = AuditLog.query.order_by(AuditLog.id.desc()).limit(limit).all()
    users = {u.id: u.full_name for u in User.query.all()}
    return jsonify([{
        "id": l.id, "type": l.action, "description": l.description,
        "userName": users.get(l.user_id), "documentNumber": None,
        "createdAt": iso(l.created_at),
    } for l in logs])


@bp.get("/dashboard/document-status-breakdown")
@require_auth()
def status_breakdown():
    rows = db.session.query(Document.status, db.func.count()).group_by(Document.status).all()
    return jsonify([{"status": s, "count": c} for s, c in rows])


@bp.get("/dashboard/print-activity")
@require_auth()
def print_activity():
    since = datetime.now(timezone.utc) - timedelta(days=30)
    txs = PrintTransaction.query.filter(PrintTransaction.printed_at >= since).all()
    counts = {}
    for t in txs:
        d = t.printed_at.strftime("%Y-%m-%d") if t.printed_at else None
        if d:
            counts[d] = counts.get(d, 0) + 1
    return jsonify([{"date": d, "count": c} for d, c in sorted(counts.items())])


@bp.get("/dashboard/top-documents")
@require_auth()
def top_documents():
    limit = request.args.get("limit", 10, type=int)
    rows = (db.session.query(PrintTransaction.document_id, db.func.count().label("c"))
            .group_by(PrintTransaction.document_id).order_by(db.desc("c")).limit(limit).all())
    out = []
    for doc_id, count in rows:
        doc = db.session.get(Document, doc_id)
        out.append({"documentId": doc_id,
                    "documentNumber": doc.document_number if doc else None,
                    "title": doc.title if doc else None,
                    "printCount": count})
    return jsonify(out)


# ---------- Audit logs ----------

@bp.get("/audit-logs")
@require_auth(AUDIT_ROLES)
def audit_logs():
    q = AuditLog.query
    if request.args.get("userId"):
        q = q.filter(AuditLog.user_id == int(request.args["userId"]))
    if request.args.get("action"):
        q = q.filter(AuditLog.action == request.args["action"])
    if request.args.get("module"):
        q = q.filter(AuditLog.module == request.args["module"])
    if request.args.get("fromDate"):
        q = q.filter(AuditLog.created_at >= datetime.fromisoformat(
            request.args["fromDate"].replace("Z", "+00:00")))
    if request.args.get("toDate"):
        q = q.filter(AuditLog.created_at <= datetime.fromisoformat(
            request.args["toDate"].replace("Z", "+00:00")))
    page = max(1, request.args.get("page", 1, type=int))
    limit = request.args.get("limit", 50, type=int)
    total = q.count()
    logs = q.order_by(AuditLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
    users = {u.id: u.full_name for u in User.query.all()}
    return jsonify({"data": [{
        "id": l.id, "userId": l.user_id, "userName": users.get(l.user_id),
        "action": l.action, "module": l.module, "description": l.description,
        "recordType": l.record_type, "recordId": l.record_id,
        "oldValue": l.old_value, "newValue": l.new_value,
        "ipAddress": l.ip_address, "userAgent": l.user_agent,
        "createdAt": iso(l.created_at),
    } for l in logs], "total": total, "page": page, "limit": limit})


# ---------- Reports ----------

@bp.get("/reports/printing")
@require_auth(REPORT_ROLES)
def report_printing():
    q = PrintTransaction.query
    if request.args.get("fromDate"):
        q = q.filter(PrintTransaction.printed_at >= datetime.fromisoformat(
            request.args["fromDate"].replace("Z", "+00:00")))
    if request.args.get("toDate"):
        q = q.filter(PrintTransaction.printed_at <= datetime.fromisoformat(
            request.args["toDate"].replace("Z", "+00:00")))
    txs = q.all()
    by_doc, by_day = {}, {}
    for t in txs:
        by_doc[t.document_id] = by_doc.get(t.document_id, 0) + 1
        d = t.printed_at.strftime("%Y-%m-%d") if t.printed_at else None
        if d:
            by_day[d] = by_day.get(d, 0) + 1
    docs = {d.id: d for d in Document.query.filter(Document.id.in_(by_doc.keys())).all()} if by_doc else {}
    return jsonify({
        "totalPrints": len(txs),
        "uniqueDocuments": len(by_doc),
        "uniqueEmployees": len({t.employee_id for t in txs}),
        "byDocument": [{"documentNumber": docs[i].document_number if i in docs else None,
                        "title": docs[i].title if i in docs else None, "printCount": c}
                       for i, c in sorted(by_doc.items(), key=lambda x: -x[1])],
        "byDay": [{"date": d, "count": c} for d, c in sorted(by_day.items())],
    })


@bp.get("/reports/distribution")
@require_auth(REPORT_ROLES)
def report_distribution():
    txs = PrintTransaction.query.all()
    by_dept, by_cat = {}, {}
    for t in txs:
        doc = t.document
        if doc and doc.department:
            by_dept[doc.department.name] = by_dept.get(doc.department.name, 0) + 1
        if doc and doc.category:
            by_cat[doc.category.name] = by_cat.get(doc.category.name, 0) + 1
    return jsonify({
        "totalDistributions": len(txs),
        "byDepartment": [{"name": n, "count": c} for n, c in sorted(by_dept.items(), key=lambda x: -x[1])],
        "byCategory": [{"name": n, "count": c} for n, c in sorted(by_cat.items(), key=lambda x: -x[1])],
    })


@bp.get("/reports/revisions")
@require_auth(REPORT_ROLES)
def report_revisions():
    from helpers import format_revision
    total = Revision.query.count()
    rows = db.session.query(Revision.status, db.func.count()).group_by(Revision.status).all()
    recent = Revision.query.order_by(Revision.id.desc()).limit(10).all()
    return jsonify({
        "totalRevisions": total,
        "byStatus": [{"status": s, "count": c} for s, c in rows],
        "recentRevisions": [format_revision(r) for r in recent],
    })


@bp.get("/reports/obsolete")
@require_auth(REPORT_ROLES)
def report_obsolete():
    revs = Revision.query.filter_by(status="obsolete").order_by(Revision.updated_at.desc()).all()
    return jsonify([{
        "documentId": r.document_id,
        "documentNumber": r.document.document_number if r.document else None,
        "title": r.document.title if r.document else None,
        "revisionNumber": r.revision_number,
        "obsoleteSince": iso(r.updated_at),
    } for r in revs])
