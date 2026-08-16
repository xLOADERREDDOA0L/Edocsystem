"""eDocs Control — Flask + SQLite backend.

Run:  python app.py   (serves on PORT, default 8080)
"""
import os
from datetime import datetime, timezone

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from models import db


def create_app():
    app = Flask(__name__)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.environ.get("DATABASE_FILE", os.path.join(base_dir, "edocs.db"))
    app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024
    CORS(app)
    db.init_app(app)

    import routes_auth, routes_users, routes_meta, routes_documents
    import routes_requests, routes_printing, routes_verification
    import routes_dashboard, routes_storage

    for module in (routes_auth, routes_users, routes_meta, routes_documents,
                   routes_requests, routes_printing, routes_verification,
                   routes_dashboard, routes_storage):
        app.register_blueprint(module.bp, url_prefix="/api")

    @app.get("/api/healthz")
    def healthz():
        return jsonify({"status": "ok",
                        "timestamp": datetime.now(timezone.utc).isoformat()})

    # Serve the pre-built React frontend (static_app/) so the whole system
    # runs on Python alone — no Node.js needed to use it.
    static_dir = os.path.join(base_dir, "static_app")
    if os.path.isdir(static_dir):
        @app.get("/")
        @app.get("/<path:spa_path>")
        def spa(spa_path="index.html"):
            full = os.path.normpath(os.path.join(static_dir, spa_path))
            if full.startswith(static_dir) and os.path.isfile(full):
                return send_from_directory(static_dir, spa_path)
            # SPA fallback: let the React router handle the URL
            return send_from_directory(static_dir, "index.html")

    with app.app_context():
        db.create_all()
        # Repair data created by older versions: revisions saved as "submitted"
        # never showed approve/reject buttons (the UI keys off "under_review").
        from models import Revision
        # Docs left as "submitted" while awaiting approval -> show "under_review"
        from models import Document as _Doc
        _Doc.query.filter_by(status="submitted").update({"status": "under_review"})
        db.session.commit()
        stuck = Revision.query.filter_by(status="submitted").all()
        if stuck:
            for rev in stuck:
                rev.status = "under_review"
            db.session.commit()
            print(f" * Repaired {len(stuck)} pending revision(s) so they can be approved.")

    return app


app = create_app()


def _pick_port(preferred):
    """Return a usable port, trying `preferred` first.

    On Windows, some ports (often 8080) are reserved by the system and binding
    fails with "access forbidden" (WinError 10013). Fall back to alternatives.
    """
    import socket
    candidates = [preferred, 8090, 8888, 5050, 3001, 9090]
    for candidate in candidates:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(("0.0.0.0", candidate))
            s.close()
            return candidate
        except OSError:
            continue
    raise SystemExit("No usable port found. Set the PORT environment variable to a free port.")


if __name__ == "__main__":
    preferred = int(os.environ.get("PORT", "8080"))
    port = _pick_port(preferred)

    # Tell the frontend dev server which port we're on (vite reads this file).
    base_dir = os.path.dirname(os.path.abspath(__file__))
    with open(os.path.join(base_dir, ".api-port"), "w") as f:
        f.write(str(port))

    if port != preferred:
        print(f"[!] Port {preferred} is blocked or busy on this computer — using port {port} instead.")
        print("    That's fine: the frontend finds the right port automatically.")
        print("    (Just restart the frontend if it was already running.)")
    print(f" * eDocs API running on http://localhost:{port}")
    # use_reloader=False: the auto-reloader starts the app twice, which
    # confusingly picks two different ports on machines where 8080 is blocked.
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)
