import bcrypt
from flask import Blueprint, g, jsonify, request

from email_notifications import send_account_status_email
from helpers import log_audit, require_auth, user_profile
from models import User, db

bp = Blueprint("users", __name__)

MANAGE_ROLES = ("administrator", "document_controller", "supervisor")


@bp.get("/users")
@require_auth(MANAGE_ROLES)
def list_users():
    q = User.query
    if request.args.get("role"):
        q = q.filter(User.role == request.args["role"])
    if request.args.get("department"):
        q = q.filter(User.department_id == int(request.args["department"]))
    if request.args.get("status"):
        q = q.filter(User.status == request.args["status"])
    if request.args.get("search"):
        s = f"%{request.args['search']}%"
        q = q.filter(db.or_(User.full_name.ilike(s), User.employee_id.ilike(s), User.email.ilike(s)))
    return jsonify([user_profile(u) for u in q.order_by(User.id).all()])


@bp.post("/users")
@require_auth(("administrator",))
def create_user():
    body = request.get_json(silent=True) or {}
    for f in ("employeeId", "fullName", "email", "password", "role"):
        if not body.get(f):
            return jsonify({"error": f"{f} is required"}), 400
    if User.query.filter_by(employee_id=body["employeeId"]).first():
        return jsonify({"error": "Employee ID already exists"}), 400
    user = User(
        employee_id=body["employeeId"],
        full_name=body["fullName"],
        email=body["email"],
        password_hash=bcrypt.hashpw(body["password"].encode(), bcrypt.gensalt(10)).decode(),
        role=body["role"],
        department_id=body.get("departmentId"),
        must_change_password=bool(body.get("mustChangePassword", False)),
    )
    db.session.add(user)
    db.session.commit()
    send_account_status_email(user, "created", "An administrator created your eDocs account. Please sign in using the credentials you were provided.")
    log_audit(g.user.id, "CREATE_USER", "users",
              f"Created user {user.employee_id}", "user", user.id)
    return jsonify(user_profile(user)), 201


@bp.get("/users/<int:user_id>")
@require_auth()
def get_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user_profile(user))


@bp.patch("/users/<int:user_id>")
@require_auth(("administrator",))
def update_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    body = request.get_json(silent=True) or {}
    for key, attr in (("fullName", "full_name"), ("email", "email"),
                      ("role", "role"), ("departmentId", "department_id")):
        if key in body:
            setattr(user, attr, body[key])
    db.session.commit()
    log_audit(g.user.id, "UPDATE_USER", "users",
              f"Updated user {user.employee_id}", "user", user.id)
    return jsonify(user_profile(user))


def _set_status(user_id, status, action):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.status = status
    db.session.commit()
    if status == "active":
        send_account_status_email(user, "approved", "Your account has been approved and you can log in to the eDocs system.")
    elif status == "disabled":
        send_account_status_email(user, "disabled", "Your account has been disabled. Please contact the administrator for more information.")
    log_audit(g.user.id, action, "users",
              f"{action.replace('_', ' ').title()} {user.employee_id}", "user", user.id)
    return jsonify(user_profile(user))


@bp.post("/users/<int:user_id>/approve")
@require_auth(("administrator",))
def approve_user(user_id):
    return _set_status(user_id, "active", "APPROVE_USER")


@bp.post("/users/<int:user_id>/reject")
@require_auth(("administrator",))
def reject_user(user_id):
    return _set_status(user_id, "disabled", "REJECT_USER")


@bp.post("/users/<int:user_id>/disable")
@require_auth(("administrator",))
def disable_user(user_id):
    return _set_status(user_id, "disabled", "DISABLE_USER")


@bp.post("/users/<int:user_id>/enable")
@require_auth(("administrator",))
def enable_user(user_id):
    return _set_status(user_id, "active", "ENABLE_USER")


@bp.post("/users/<int:user_id>/reset-password")
@require_auth(("administrator",))
def reset_password(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    body = request.get_json(silent=True) or {}
    if not body.get("newPassword"):
        return jsonify({"error": "newPassword is required"}), 400
    user.password_hash = bcrypt.hashpw(body["newPassword"].encode(), bcrypt.gensalt(10)).decode()
    user.must_change_password = True
    db.session.commit()
    log_audit(g.user.id, "RESET_PASSWORD", "users",
              f"Reset password for {user.employee_id}", "user", user.id)
    return jsonify({"message": "Password reset successfully"})
