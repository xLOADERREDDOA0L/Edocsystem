import bcrypt
from flask import Blueprint, g, jsonify, request

from email_notifications import send_registration_email
from helpers import iso, log_audit, make_token, require_auth, user_profile
from models import User, db, utcnow

bp = Blueprint("auth", __name__)


@bp.post("/auth/register")
def register():
    body = request.get_json(silent=True) or {}
    for f in ("employeeId", "fullName", "email", "password"):
        if not body.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    if User.query.filter_by(employee_id=body["employeeId"].upper()).first():
        return jsonify({"error": "Employee ID already exists"}), 400
    if User.query.filter_by(email=body["email"].lower()).first():
        return jsonify({"error": "Email address already in use"}), 400
    # Self-registered accounts start as pending until an admin approves them
    user = User(
        employee_id=body["employeeId"].upper(),
        full_name=body["fullName"],
        email=body["email"].lower(),
        password_hash=bcrypt.hashpw(body["password"].encode(), bcrypt.gensalt(10)).decode(),
        role=body.get("role", "employee"),
        department_id=body.get("departmentId") or None,
        status="pending",
        must_change_password=False,
    )
    db.session.add(user)
    db.session.commit()
    send_registration_email(user)
    log_audit(None, "REGISTER", "auth",
              f"Self-registration request from {user.employee_id}", "user", user.id)
    return jsonify({"message": "Registration submitted. Please wait for an administrator to approve your account."}), 201


@bp.post("/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    username, password = body.get("username"), body.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    user = User.query.filter_by(employee_id=username).first()
    if not user or not user.password_hash or not bcrypt.checkpw(
        password.encode(), user.password_hash.encode()
    ):
        return jsonify({"error": "Invalid credentials"}), 401
    if user.status == "pending":
        return jsonify({"error": "Your account is awaiting administrator approval"}), 401
    if user.status == "disabled":
        return jsonify({"error": "Account is disabled. Please contact your administrator."}), 401
    user.last_login = utcnow()
    db.session.commit()
    log_audit(user.id, "LOGIN", "auth", f"User {user.employee_id} logged in")
    return jsonify({"token": make_token(user.id), "user": user_profile(user)})


@bp.post("/auth/logout")
@require_auth()
def logout():
    log_audit(g.user.id, "LOGOUT", "auth", f"User {g.user.employee_id} logged out")
    return "", 204


@bp.get("/auth/me")
@require_auth()
def me():
    return jsonify(user_profile(g.user))


@bp.post("/auth/refresh")
@require_auth()
def refresh():
    return jsonify({"token": make_token(g.user.id)})


@bp.post("/auth/change-password")
@require_auth()
def change_password():
    body = request.get_json(silent=True) or {}
    current, new = body.get("currentPassword"), body.get("newPassword")
    if not current or not new:
        return jsonify({"error": "Current and new password are required"}), 400
    if not bcrypt.checkpw(current.encode(), g.user.password_hash.encode()):
        return jsonify({"error": "Current password is incorrect"}), 400
    g.user.password_hash = bcrypt.hashpw(new.encode(), bcrypt.gensalt(10)).decode()
    g.user.must_change_password = False
    db.session.commit()
    log_audit(g.user.id, "CHANGE_PASSWORD", "auth",
              f"User {g.user.employee_id} changed their password")
    return jsonify({"message": "Password changed successfully"})
