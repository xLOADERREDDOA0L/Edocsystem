#!/usr/bin/env python3
"""
eDocs System — one-command setup. Python only, no Node.js needed.

Installs the backend packages and creates the database with sample accounts.
The website is pre-built and served by Flask itself.

Usage:  python setup.py
"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
FLASK_DIR = os.path.join(ROOT, "flask-server")

GREEN = "\033[92m" if sys.stdout.isatty() else ""
RED = "\033[91m" if sys.stdout.isatty() else ""
YELLOW = "\033[93m" if sys.stdout.isatty() else ""
END = "\033[0m" if sys.stdout.isatty() else ""


def ok(msg):
    print(f"{GREEN}[OK]{END} {msg}")


def fail(msg):
    print(f"{RED}[ERROR]{END} {msg}")


def warn(msg):
    print(f"{YELLOW}[!]{END} {msg}")


def run(cmd, cwd=None, name=None):
    print(f"\n--- {name or ' '.join(cmd)} ---")
    result = subprocess.run(cmd, cwd=cwd or ROOT, shell=(os.name == "nt"))
    if result.returncode != 0:
        fail(f"Command failed: {' '.join(cmd)}")
        return False
    return True


def main():
    print("=" * 60)
    print("  eDocs System — Setup (Python only)")
    print("=" * 60)

    # 1. Check Python version
    if sys.version_info < (3, 10):
        fail(f"Python 3.10+ required (you have {sys.version.split()[0]}). Install from https://python.org")
        sys.exit(1)
    ok(f"Python {sys.version.split()[0]}")

    # 2. Check the pre-built website is present
    static_dir = os.path.join(FLASK_DIR, "static_app")
    if os.path.isdir(static_dir):
        ok("Pre-built website found (flask-server/static_app)")
    else:
        warn("Pre-built website missing — the app will still run as an API, "
             "but you won't see pages. Re-download the project zip.")

    # 3. Install Python packages
    if not run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
               cwd=FLASK_DIR, name="Install backend packages (pip)"):
        sys.exit(1)
    ok("Backend packages installed")

    # 4. Create database + sample accounts
    db_file = os.path.join(FLASK_DIR, "edocs.db")
    if os.path.exists(db_file):
        warn("Database already exists — keeping your data (delete flask-server/edocs.db to reset).")
    if not run([sys.executable, "seed.py"], cwd=FLASK_DIR, name="Create database + sample accounts"):
        sys.exit(1)
    ok("Database ready (flask-server/edocs.db)")

    # Done
    print("\n" + "=" * 60)
    print(f"{GREEN}  Setup complete!{END}")
    print("=" * 60)
    print("""
To start the system (ONE terminal is enough):

      cd flask-server
      python app.py

Then open the address it prints (e.g. http://localhost:8080) and log in:

      ADMIN001 / Admin@1234      (Administrator)
      DC001    / Password@123    (Document Controller)
      ENG001   / Password@123    (Engineer)
      SUP001   / Password@123    (Supervisor)
      EMP001   / Password@123    (Employee)
      INS001   / Password@123    (Inspector)
""")

    try:
        answer = input("Start the system now? [y/N] ").strip().lower()
    except (EOFError, KeyboardInterrupt):
        answer = "n"
    if answer == "y":
        print("\nStarting eDocs (press Ctrl+C to stop)...\n")
        subprocess.run([sys.executable, "app.py"], cwd=FLASK_DIR, shell=(os.name == "nt"))


if __name__ == "__main__":
    main()
