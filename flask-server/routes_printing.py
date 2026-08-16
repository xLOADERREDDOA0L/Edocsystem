"""Controlled printing."""
import time
import uuid
from datetime import datetime

from flask import Blueprint, g, jsonify, request

from helpers import iso, log_audit, require_auth
from models import Document, PrintTransaction, Revision, db

bp = Blueprint("printing", __name__)


def _fmt(t):
    return {
        "id": t.id,
        "transactionNumber": t.transaction_number,
        "documentId": t.document_id,
        "documentNumber": t.document.document_number if t.document else None,
        "documentTitle": t.document.title if t.document else None,
        "revisionId": t.revision_id,
        "revisionNumber": t.revision.revision_number if t.revision else None,
        "employeeId": t.employee_id,
        "employeeName": t.employee.full_name if t.employee else None,
        "copyNumber": t.copy_number,
        "numberOfCopies": t.number_of_copies,
        "qrToken": t.qr_token,
        "status": t.status,
        "printedAt": iso(t.printed_at),
        "ipAddress": t.ip_address,
    }


@bp.post("/print")
@require_auth(("administrator", "document_controller"))
def print_document():
    body = request.get_json(silent=True) or {}
    for f in ("documentId", "revisionId", "numberOfCopies"):
        if not body.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    doc = db.session.get(Document, body["documentId"])
    rev = db.session.get(Revision, body["revisionId"])
    if not doc or not rev:
        return jsonify({"error": "Document or revision not found"}), 404
    if rev.status != "approved" or doc.current_revision_id != rev.id:
        return jsonify({"error": "Only the current approved revision can be printed"}), 400
    now_ms = int(time.time() * 1000)
    tx = PrintTransaction(
        transaction_number=f"TX-{now_ms}",
        document_id=doc.id,
        revision_id=rev.id,
        employee_id=g.user.id,
        copy_number=str(now_ms),
        number_of_copies=body["numberOfCopies"],
        qr_token=uuid.uuid4().hex,
        status="completed",
        purpose=body.get("purpose"),
        ip_address=request.remote_addr,
    )
    db.session.add(tx)
    db.session.commit()
    log_audit(g.user.id, "PRINT_DOCUMENT", "printing",
              f"Printed {doc.document_number} rev {rev.revision_number} "
              f"({tx.number_of_copies} copies)", "print_transaction", tx.id)
    return jsonify(_fmt(tx)), 201


@bp.get("/print-transactions")
@require_auth()
def list_transactions():
    q = PrintTransaction.query
    if request.args.get("documentId"):
        q = q.filter(PrintTransaction.document_id == int(request.args["documentId"]))
    if request.args.get("userId"):
        q = q.filter(PrintTransaction.employee_id == int(request.args["userId"]))
    if request.args.get("fromDate"):
        q = q.filter(PrintTransaction.printed_at >= datetime.fromisoformat(
            request.args["fromDate"].replace("Z", "+00:00")))
    if request.args.get("toDate"):
        q = q.filter(PrintTransaction.printed_at <= datetime.fromisoformat(
            request.args["toDate"].replace("Z", "+00:00")))
    return jsonify([_fmt(t) for t in q.order_by(PrintTransaction.id.desc()).all()])


@bp.get("/print-transactions/<int:tx_id>")
@require_auth()
def get_transaction(tx_id):
    tx = db.session.get(PrintTransaction, tx_id)
    if not tx:
        return jsonify({"error": "Transaction not found"}), 404
    return jsonify(_fmt(tx))
