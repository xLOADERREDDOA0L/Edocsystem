"""Departments, categories, and site configuration."""
from flask import Blueprint, g, jsonify, request

from email_notifications import get_email_settings
from helpers import iso, log_audit, require_auth
from models import Category, Department, EmailSetting, db

bp = Blueprint("meta", __name__)


def _row(m):
    return {"id": m.id, "name": m.name, "description": m.description,
            "status": m.status, "createdAt": iso(m.created_at)}


def _list(model):
    return jsonify([_row(m) for m in model.query.order_by(model.id).all()])


def _create(model, module):
    body = request.get_json(silent=True) or {}
    if not body.get("name"):
        return jsonify({"error": "name is required"}), 400
    m = model(name=body["name"], description=body.get("description"))
    db.session.add(m)
    db.session.commit()
    log_audit(g.user.id, f"CREATE_{module.upper()[:-1] if module.endswith('s') else module.upper()}",
              module, f"Created {body['name']}", module[:-1], m.id)
    return jsonify(_row(m)), 201


def _update(model, item_id):
    m = db.session.get(model, item_id)
    if not m:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(silent=True) or {}
    for f in ("name", "description", "status"):
        if f in body:
            setattr(m, f, body[f])
    db.session.commit()
    return jsonify(_row(m))


@bp.get("/departments")
def list_departments():
    # Public: the registration page needs department names before login
    return _list(Department)


@bp.post("/departments")
@require_auth(("administrator",))
def create_department():
    return _create(Department, "departments")


@bp.patch("/departments/<int:item_id>")
@require_auth(("administrator",))
def update_department(item_id):
    return _update(Department, item_id)


@bp.get("/categories")
@require_auth()
def list_categories():
    return _list(Category)


@bp.get("/settings/email")
@require_auth(("administrator",))
def get_email_config():
    settings = get_email_settings()
    return jsonify({
        "host": settings["host"],
        "port": settings["port"],
        "username": settings["username"],
        "password": settings["password"],
        "useTls": settings["use_tls"],
        "useSsl": settings["use_ssl"],
        "fromEmail": settings["from_email"],
    })


@bp.put("/settings/email")
@require_auth(("administrator",))
def update_email_config():
    body = request.get_json(silent=True) or {}
    for key, value in (
        ("SMTP_HOST", body.get("host")),
        ("SMTP_PORT", body.get("port")),
        ("SMTP_USERNAME", body.get("username")),
        ("SMTP_PASSWORD", body.get("password")),
        ("SMTP_USE_TLS", body.get("useTls")),
        ("SMTP_USE_SSL", body.get("useSsl")),
        ("EMAIL_FROM", body.get("fromEmail")),
    ):
        if value is None:
            continue
        row = db.session.query(EmailSetting).filter_by(key=key).first()
        if row is None:
            row = EmailSetting(key=key, value=str(value))
            db.session.add(row)
        else:
            row.value = str(value)
    db.session.commit()
    log_audit(g.user.id, "UPDATE_EMAIL_SETTINGS", "settings",
              "Updated SMTP email settings")
    settings = get_email_settings()
    return jsonify({
        "host": settings["host"],
        "port": settings["port"],
        "username": settings["username"],
        "password": settings["password"],
        "useTls": settings["use_tls"],
        "useSsl": settings["use_ssl"],
        "fromEmail": settings["from_email"],
    })


@bp.post("/categories")
@require_auth(("administrator", "document_controller"))
def create_category():
    return _create(Category, "categories")


@bp.patch("/categories/<int:item_id>")
@require_auth(("administrator", "document_controller"))
def update_category(item_id):
    return _update(Category, item_id)
