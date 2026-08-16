"""Shared helpers: JWT auth, audit logging, serialization."""
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, jsonify, request

from models import AuditLog, User, db

JWT_SECRET = os.environ.get("SESSION_SECRET", "changeme")
JWT_EXPIRES_HOURS = 8


def iso(dt):
    """Serialize a datetime the same way the original JS API did (UTC, Z suffix)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def make_token(user_id):
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS)},
        JWT_SECRET,
        algorithm="HS256",
    )


def verify_token(token):
    """Return the payload or None."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        return None


def _bearer_payload():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return verify_token(header[7:])


def require_auth(roles=None):
    """Decorator: validate JWT, load the user into g.user; optional role check."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            payload = _bearer_payload()
            if payload is None:
                return jsonify({"error": "Unauthorized"}), 401
            user = db.session.get(User, int(payload["sub"]))
            if user is None or user.status == "disabled":
                return jsonify({"error": "Unauthorized"}), 401
            g.user = user
            if roles and user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def token_only(fn):
    """Decorator: validate JWT signature only (parity with storage routes)."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        payload = _bearer_payload()
        if payload is None:
            return jsonify({"error": "Unauthorized"}), 401
        g.token_payload = payload
        return fn(*args, **kwargs)

    return wrapper


def log_audit(user_id, action, module, description, record_type=None, record_id=None,
              old_value=None, new_value=None):
    try:
        db.session.add(AuditLog(
            user_id=user_id,
            action=action,
            module=module,
            description=description,
            record_type=record_type,
            record_id=record_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        ))
        db.session.commit()
    except Exception:
        db.session.rollback()


def user_profile(u):
    return {
        "id": u.id,
        "employeeId": u.employee_id,
        "fullName": u.full_name,
        "email": u.email,
        "role": u.role,
        "departmentId": u.department_id,
        "departmentName": u.department.name if u.department else None,
        "status": u.status,
        "mustChangePassword": bool(u.must_change_password),
        "lastLogin": iso(u.last_login),
        "createdAt": iso(u.created_at),
    }


def format_document(d):
    cur = None
    if d.current_revision_id:
        from models import Revision
        cur = db.session.get(Revision, d.current_revision_id)
    return {
        "id": d.id,
        "documentNumber": d.document_number,
        "title": d.title,
        "categoryId": d.category_id,
        "categoryName": d.category.name if d.category else None,
        "departmentId": d.department_id,
        "departmentName": d.department.name if d.department else None,
        "description": d.description,
        "status": d.status,
        "currentRevisionId": d.current_revision_id,
        "currentRevisionNumber": cur.revision_number if cur else None,
        "createdByName": d.creator.full_name if d.creator else None,
        "createdAt": iso(d.created_at),
        "updatedAt": iso(d.updated_at),
    }


def format_revision(r):
    return {
        "id": r.id,
        "documentId": r.document_id,
        "revisionNumber": r.revision_number,
        "filePath": r.file_path,
        "fileName": r.file_name,
        "status": r.status,
        "effectiveDate": r.effective_date,
        "uploadedBy": r.uploaded_by,
        "uploadedByName": r.uploader.full_name if r.uploader else None,
        "approvedByName": r.approver.full_name if r.approver else None,
        "approvalDate": iso(r.approval_date),
        "rejectionReason": r.rejection_reason,
        "approvalComments": r.approval_comments,
        "qrToken": r.qr_token,
        "createdAt": iso(r.created_at),
    }
