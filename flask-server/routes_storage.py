"""Local-disk file storage (upload via one-time URL, authenticated download)."""
import os
import uuid

from flask import Blueprint, Response, g, jsonify, request

from helpers import log_audit, token_only
from models import Revision

bp = Blueprint("storage", __name__)

STORAGE_DIR = os.environ.get(
    "LOCAL_STORAGE_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".data", "uploads"),
)
MAX_UPLOAD = 100 * 1024 * 1024  # 100 MB


def _safe_path(object_id):
    if not object_id.replace("-", "").isalnum():
        raise ValueError("Invalid object id")
    return os.path.join(STORAGE_DIR, object_id)


@bp.post("/storage/uploads/request-url")
@token_only
def request_upload_url():
    body = request.get_json(silent=True) or {}
    name, size, content_type = body.get("name"), body.get("size"), body.get("contentType")
    if not name or size is None or not content_type:
        return jsonify({"error": "Missing or invalid required fields"}), 400
    object_id = str(uuid.uuid4())
    return jsonify({
        "uploadURL": f"/api/storage/local-upload/{object_id}",
        "objectPath": f"/objects/uploads/{object_id}",
        "metadata": {"name": name, "size": size, "contentType": content_type},
    })


@bp.put("/storage/local-upload/<object_id>")
def local_upload(object_id):
    try:
        path = _safe_path(object_id)
    except ValueError:
        return jsonify({"error": "Invalid object id"}), 400
    data = request.get_data(cache=False)
    if not data:
        return jsonify({"error": "Empty upload body"}), 400
    if len(data) > MAX_UPLOAD:
        return jsonify({"error": "File too large"}), 413
    os.makedirs(STORAGE_DIR, exist_ok=True)
    try:
        # 'xb' = exclusive create: a duplicate PUT fails atomically
        with open(path, "xb") as f:
            f.write(data)
    except FileExistsError:
        return jsonify({"error": "Object already exists"}), 409
    return jsonify({"ok": True})


@bp.get("/storage/public-objects/<path:file_path>")
def public_object(file_path):
    """Serve public assets from <storage>/public (parity with the original API)."""
    public_dir = os.path.join(os.path.dirname(STORAGE_DIR), "public")
    full = os.path.normpath(os.path.join(public_dir, file_path))
    if not full.startswith(os.path.normpath(public_dir) + os.sep) or not os.path.isfile(full):
        return jsonify({"error": "File not found"}), 404
    def generate():
        with open(full, "rb") as f:
            while chunk := f.read(64 * 1024):
                yield chunk
    return Response(generate(), headers={"Content-Type": "application/octet-stream",
                                         "Cache-Control": "public, max-age=3600"})


@bp.get("/storage/objects/<path:object_path>")
@token_only
def download_object(object_path):
    object_id = object_path.split("/")[-1]
    try:
        path = _safe_path(object_id)
    except ValueError:
        return jsonify({"error": "Object not found"}), 404
    if not os.path.isfile(path):
        return jsonify({"error": "Object not found"}), 404

    full_path = f"/objects/{object_path}"
    rev = Revision.query.filter_by(file_path=full_path).first()

    # Access control: files of non-approved revisions may only be downloaded by
    # reviewers (supervisor/DC/manager/admin) or by the person who uploaded them.
    if rev and rev.status != "approved":
        from models import db, User
        user = db.session.get(User, int(g.token_payload["sub"]))
        allowed_roles = ("administrator", "document_controller", "supervisor", "manager")
        if not user or (user.role not in allowed_roles and rev.uploaded_by != user.id):
            return jsonify({"error": "This file can only be downloaded once the document is approved"}), 403

    log_audit(
        int(g.token_payload["sub"]), "DOWNLOAD_FILE", "storage",
        (f'Downloaded file "{rev.file_name or full_path}" (document ID {rev.document_id}, '
         f"revision {rev.revision_number}, path {full_path})") if rev
        else f"Downloaded file at {full_path}",
        "revision" if rev else None, rev.id if rev else None,
    )

    def generate():
        with open(path, "rb") as f:
            while chunk := f.read(64 * 1024):
                yield chunk

    return Response(generate(), headers={
        "Content-Type": "application/octet-stream",
        "Content-Length": str(os.path.getsize(path)),
        "Cache-Control": "private, max-age=3600",
    })
