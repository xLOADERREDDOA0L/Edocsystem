"""Public QR verification."""
from flask import Blueprint, jsonify

from helpers import iso, log_audit
from models import PrintTransaction, Revision, db, utcnow

bp = Blueprint("verification", __name__)


@bp.get("/verify/<token>")
def verify(token):
    verified_at = iso(utcnow())

    tx = PrintTransaction.query.filter_by(qr_token=token).first()
    if tx:
        doc, rev = tx.document, tx.revision
        current = db.session.get(Revision, doc.current_revision_id) if doc and doc.current_revision_id else None
        log_audit(None, "QR_VERIFY", "verification",
                  f"QR verified for print transaction {tx.transaction_number}",
                  "print_transaction", tx.id)
        base = {
            "verifiedAt": verified_at,
            "documentNumber": doc.document_number if doc else None,
            "documentTitle": doc.title if doc else None,
            "documentStatus": doc.status if doc else None,
            "revisionNumber": rev.revision_number if rev else None,
            "effectiveDate": rev.effective_date if rev else None,
            "copyNumber": tx.copy_number,
            "printedBy": tx.employee.full_name if tx.employee else None,
            "printedAt": iso(tx.printed_at),
        }
        if rev and rev.status == "obsolete":
            return jsonify({**base, "valid": False, "status": "obsolete",
                            "currentRevisionNumber": current.revision_number if current else None,
                            "message": "This copy is OBSOLETE. A newer revision is in effect."})
        if not rev or rev.status != "approved":
            return jsonify({**base, "valid": False, "status": "invalid",
                            "message": "This copy is NOT from an approved revision."})
        return jsonify({**base, "valid": True, "status": "valid",
                        "message": "This is a valid controlled copy."})

    rev = Revision.query.filter_by(qr_token=token).first()
    if rev:
        doc = rev.document
        current = db.session.get(Revision, doc.current_revision_id) if doc and doc.current_revision_id else None
        log_audit(None, "QR_VERIFY", "verification",
                  f"QR verified for revision {rev.revision_number}", "revision", rev.id)
        base = {
            "verifiedAt": verified_at,
            "documentNumber": doc.document_number if doc else None,
            "documentTitle": doc.title if doc else None,
            "documentStatus": doc.status if doc else None,
            "revisionNumber": rev.revision_number,
            "effectiveDate": rev.effective_date,
            "copyNumber": None,
            "printedBy": None,
            "printedAt": None,
        }
        if rev.status == "obsolete":
            return jsonify({**base, "valid": False, "status": "obsolete",
                            "currentRevisionNumber": current.revision_number if current else None,
                            "message": "This revision is OBSOLETE. A newer revision is in effect."})
        if rev.status != "approved":
            return jsonify({**base, "valid": False, "status": "invalid",
                            "message": "This revision is NOT approved."})
        return jsonify({**base, "valid": True, "status": "valid",
                        "message": "This is the current approved revision."})

    return jsonify({"valid": False, "status": "invalid", "verifiedAt": verified_at,
                    "message": "Unknown or invalid QR code."})
