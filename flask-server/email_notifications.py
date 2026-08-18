import os
import smtplib
from email.message import EmailMessage

from models import EmailSetting


def _read_setting(key, default=""):
    try:
        from flask import current_app
        if current_app is not None:
            from models import db
            row = db.session.query(EmailSetting).filter_by(key=key).first()
            if row is not None and row.value is not None:
                return row.value
    except Exception:
        pass
    return os.getenv(key, default).strip()


def get_email_settings():
    use_tls = _read_setting("SMTP_USE_TLS", "false").strip().lower() in {"1", "true", "yes", "on"}
    use_ssl = _read_setting("SMTP_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "on"}
    return {
        "host": _read_setting("SMTP_HOST", "").strip(),
        "port": int(_read_setting("SMTP_PORT", "587") or 587),
        "username": _read_setting("SMTP_USERNAME", "").strip(),
        "password": _read_setting("SMTP_PASSWORD", "").strip(),
        "use_tls": use_tls,
        "use_ssl": use_ssl,
        "from_email": _read_setting("EMAIL_FROM", "noreply@edocs.local").strip() or "noreply@edocs.local",
    }


def _smtp_settings():
    return get_email_settings()


def send_email(to_email, subject, body):
    if not to_email:
        return False
    settings = _smtp_settings()
    if not settings["host"]:
        print("[email] SMTP is not configured; skipping email notification.")
        return False

    message = EmailMessage()
    message["From"] = settings["from_email"]
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    try:
        if settings["use_ssl"]:
            server = smtplib.SMTP_SSL(settings["host"], settings["port"], timeout=15)
        else:
            server = smtplib.SMTP(settings["host"], settings["port"], timeout=15)

        if settings["use_tls"] and not settings["use_ssl"]:
            server.starttls()
        if settings["username"] and settings["password"]:
            server.login(settings["username"], settings["password"])
        server.send_message(message)
        server.quit()
        return True
    except Exception as exc:  # pragma: no cover - defensive runtime path
        print(f"[email] Failed to send notification: {exc}")
        return False


def send_registration_email(user):
    user_email = getattr(user, "email", None)
    if not user_email:
        return False
    full_name = getattr(user, "full_name", None) or getattr(user, "employee_id", "there")
    subject = "Registration submitted - eDocs"
    body = (
        f"Hello {full_name},\n\n"
        "Your eDocs account registration has been received and is awaiting administrator approval.\n"
        "You will receive another email once your account status changes.\n\n"
        "Thank you,\n"
        "eDocs Administration"
    )
    return send_email(user_email, subject, body)


def send_account_status_email(user, status, details=""):
    user_email = getattr(user, "email", None)
    if not user_email:
        return False
    cleaned_status = (status or "updated").strip().lower()
    status_label = cleaned_status.title()
    subject = f"eDocs account {cleaned_status}"
    body = (
        f"Hello {getattr(user, 'full_name', None) or getattr(user, 'employee_id', 'there')},\n\n"
        f"Your eDocs account has been {cleaned_status}.\n"
    )
    if details:
        body += f"\n{details}\n"
    body += "\nPlease sign in to continue.\n\nThank you,\n eDocs Administration"
    return send_email(user_email, subject, body)


def send_request_pending_email(requester, approvers, request_number, document_title):
    if not approvers:
        return False
    requester_name = getattr(requester, "full_name", None) or getattr(requester, "employee_id", "Employee")
    document_label = document_title or "document"
    sent = False
    for approver in approvers:
        approver_email = getattr(approver, "email", None)
        if not approver_email:
            continue
        subject = f"Approval required: {request_number}"
        body = (
            f"Hello {getattr(approver, 'full_name', 'Supervisor')},\n\n"
            f"{requester_name} has submitted a request for {document_label} ({request_number}).\n"
            "This request requires your approval before the work can continue.\n\n"
            "Please review and approve or reject it in the eDocs system.\n\n"
            "Thank you,\n"
            "eDocs Administration"
        )
        if send_email(approver_email, subject, body):
            sent = True
    return sent


def send_request_approved_email(requester, request_number, approver_name="Supervisor"):
    requester_email = getattr(requester, "email", None)
    if not requester_email:
        return False
    requester_name = getattr(requester, "full_name", None) or getattr(requester, "employee_id", "Employee")
    subject = f"Request approved: {request_number}"
    body = (
        f"Hello {requester_name},\n\n"
        f"Your request {request_number} has been approved by {approver_name}.\n"
        "You may proceed with the next step in the eDocs system.\n\n"
        "Thank you,\n"
        "eDocs Administration"
    )
    return send_email(requester_email, subject, body)


def send_request_rejected_email(requester, request_number, approver_name="Supervisor", reason=None):
    requester_email = getattr(requester, "email", None)
    if not requester_email:
        return False
    requester_name = getattr(requester, "full_name", None) or getattr(requester, "employee_id", "Employee")
    subject = f"Request rejected: {request_number}"
    body = (
        f"Hello {requester_name},\n\n"
        f"Your request {request_number} was rejected by {approver_name}.\n"
    )
    if reason:
        body += f"Reason: {reason}\n"
    body += "\nPlease contact your supervisor for more details.\n\nThank you,\n eDocs Administration"
    return send_email(requester_email, subject, body)


def send_revision_pending_email(uploader, approvers, document_number, revision_number):
    if not approvers:
        return False
    uploader_name = getattr(uploader, "full_name", None) or getattr(uploader, "employee_id", "Employee")
    sent = False
    for approver in approvers:
        approver_email = getattr(approver, "email", None)
        if not approver_email:
            continue
        subject = f"Review required: {document_number} {revision_number}"
        body = (
            f"Hello {getattr(approver, 'full_name', 'Approver')},\n\n"
            f"{uploader_name} has submitted revision {revision_number} for {document_number}.\n"
            "This revision requires your review and approval before it can move forward.\n\n"
            "Please review it in the eDocs system.\n\n"
            "Thank you,\n"
            "eDocs Administration"
        )
        if send_email(approver_email, subject, body):
            sent = True
    return sent


def send_revision_approved_email(uploader, document_number, revision_number, approver_name="Supervisor"):
    uploader_email = getattr(uploader, "email", None)
    if not uploader_email:
        return False
    uploader_name = getattr(uploader, "full_name", None) or getattr(uploader, "employee_id", "Employee")
    subject = f"Revision approved: {document_number} {revision_number}"
    body = (
        f"Hello {uploader_name},\n\n"
        f"Your revision {revision_number} for {document_number} has been approved by {approver_name}.\n"
        "The document is now ready for the next stage in the approval process.\n\n"
        "Thank you,\n"
        "eDocs Administration"
    )
    return send_email(uploader_email, subject, body)


def send_revision_rejected_email(uploader, document_number, revision_number, approver_name="Supervisor", reason=None):
    uploader_email = getattr(uploader, "email", None)
    if not uploader_email:
        return False
    uploader_name = getattr(uploader, "full_name", None) or getattr(uploader, "employee_id", "Employee")
    subject = f"Revision rejected: {document_number} {revision_number}"
    body = (
        f"Hello {uploader_name},\n\n"
        f"Your revision {revision_number} for {document_number} was rejected by {approver_name}.\n"
    )
    if reason:
        body += f"Reason: {reason}\n"
    body += "\nPlease review the feedback and resubmit the revision once it is corrected.\n\nThank you,\n eDocs Administration"
    return send_email(uploader_email, subject, body)
