# Running eDocs Locally — Python Only

The whole system now runs with **Python alone**: Flask serves both the API and
the pre-built website, and the database is a single SQLite file.
**No Node.js, no pnpm, no database server needed.**

## Quick start

```bash
python setup.py      # installs packages + creates the database (one time)

cd flask-server
python app.py        # starts everything
```

Open the address it prints — normally **http://localhost:8080** (if that port is
blocked on your PC, it automatically picks another and tells you).

Log in with:

| Employee ID | Password | Role |
|---|---|---|
| ADMIN001 | Admin@1234 | Administrator |
| DC001 | Password@123 | Document Controller |
| ENG001 | Password@123 | Engineer |
| SUP001 | Password@123 | Supervisor |
| EMP001 | Password@123 | Employee |
| INS001 | Password@123 | Inspector |

## Prerequisites

- **Python 3.10+** — https://python.org (on Windows, tick "Add Python to PATH" during install)

That's it.

## Manual setup (what setup.py does)

```bash
cd flask-server
pip install -r requirements.txt   # install packages
python seed.py                    # create database + sample accounts
python app.py                     # run
```

## Where things are stored

- Database: `flask-server/edocs.db` — delete it and re-run `python seed.py` to reset everything
- Uploaded PDFs: `flask-server/.data/uploads/`
- Website files: `flask-server/static_app/` (pre-built — don't edit these by hand)

## Optional settings (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | Server port (auto-falls back if blocked) |
| `SESSION_SECRET` | `changeme` | Login token signing secret — set your own for real use |
| `DATABASE_FILE` | `flask-server/edocs.db` | Database location |

## Troubleshooting

- **"python is not recognized"** — reinstall Python and tick "Add Python to PATH", or use `py` instead of `python`.
- **Blank page / Not Found** — make sure `flask-server/static_app/` exists (re-download the zip if not).
- **Login fails** — run `python seed.py` once to create the accounts.
- **Want a clean start?** — stop the server, delete `flask-server/edocs.db` and `flask-server/.data/`, run `python seed.py` again.

## For developers only (changing the website's design)

The React source code lives in `artifacts/edocs`. Editing it requires Node.js 22+
and pnpm. After changes, rebuild and copy the result into Flask:

```bash
pnpm install
pnpm --filter @workspace/edocs run build
# then replace flask-server/static_app with artifacts/edocs/dist/public
```

Normal use never requires this.
