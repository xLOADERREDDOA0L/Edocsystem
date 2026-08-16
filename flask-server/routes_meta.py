"""Departments and categories."""
from flask import Blueprint, g, jsonify, request

from helpers import iso, log_audit, require_auth
from models import Category, Department, db

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


@bp.post("/categories")
@require_auth(("administrator", "document_controller"))
def create_category():
    return _create(Category, "categories")


@bp.patch("/categories/<int:item_id>")
@require_auth(("administrator", "document_controller"))
def update_category(item_id):
    return _update(Category, item_id)
