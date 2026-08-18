# eDocs Control — Flask + SQLite (Python-only)

Flask serves both the API **and** the pre-built website (`static_app/`), and the
database is a single SQLite file (`edocs.db`). Running the system needs only
Python — no Node.js, no pnpm, no database server.

## Requirements
- Python 3.10+

## Setup & Run

```bash
cd flask-server
pip install -r requirements.txt

# create tables + default accounts
python seed.py

# start everything (port 8080, auto-falls back if blocked)
python app.py
```

Open the printed address (normally http://localhost:8080) and log in with
`ADMIN001` / `Admin@1234`.

## Configuration (optional environment variables)
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | API port (must match the frontend proxy / `API_PORT`) |
| `SESSION_SECRET` | `changeme` | JWT signing secret — set your own string |
| `DATABASE_FILE` | `flask-server/edocs.db` | SQLite database location |
| `LOCAL_STORAGE_DIR` | `flask-server/.data/uploads` | Uploaded PDF storage |
| `SMTP_HOST` | *(unset)* | SMTP server host for outbound notifications |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USERNAME` | *(unset)* | SMTP username |
| `SMTP_PASSWORD` | *(unset)* | SMTP password |
| `SMTP_USE_TLS` | `false` | Use STARTTLS before sending mail |
| `SMTP_USE_SSL` | `false` | Use SMTPS instead of plain SMTP |
| `EMAIL_FROM` | `noreply@edocs.local` | Email sender address shown on notifications |

Example SMTP config:

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=you@gmail.com
export SMTP_PASSWORD=your-app-password
export SMTP_USE_TLS=true
export EMAIL_FROM=noreply@yourdomain.com
```

## Default accounts
| Username | Password | Role |
|---|---|---|
| ADMIN001 | Admin@1234 | Administrator |
| DC001 | Password@123 | Document Controller |
| ENG001 | Password@123 | Engineer |
| SUP001 | Password@123 | Supervisor |
| EMP001 | Password@123 | Employee |
| INS001 | Password@123 | Inspector |

## Structure
- `app.py` — Flask app factory and entry point
- `models.py` — SQLAlchemy models (SQLite schema)
- `helpers.py` — JWT auth decorators, audit logging, serializers
- `routes_*.py` — one module per API area (auth, users, documents, printing, …)
- `seed.py` — idempotent seed script

## Notes
- Passwords use bcrypt (same hashes as the Node version).
- QR tokens are 32-character UUIDs, verified via the public `/api/verify/<token>` route.
- Every sensitive action is written to the `audit_logs` table.
- `edocs.db` and `.data/` are created automatically and should not be committed.
