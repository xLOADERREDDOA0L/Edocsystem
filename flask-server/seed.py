"""Seed the SQLite database with departments, categories, and default accounts.

Run:  python seed.py
"""
import bcrypt

from app import create_app
from models import Category, Department, User, db

DEPARTMENTS = [
    ("Engineering", "Engineering design and development"),
    ("Manufacturing", "Production and assembly operations"),
    ("Quality Assurance", "Quality control and compliance"),
    ("Maintenance", "Equipment and facility maintenance"),
    ("Safety", "Workplace safety and compliance"),
]

CATEGORIES = [
    ("Electrical Diagrams", "Electrical schematics and wiring diagrams"),
    ("Mechanical Drawings", "Mechanical design drawings and blueprints"),
    ("Bill of Materials", "Component and material listings"),
    ("Work Instructions", "Step-by-step operational procedures"),
    ("Safety Procedures", "Safety protocols and guidelines"),
    ("Quality Standards", "Quality specifications and standards"),
    ("Maintenance Manuals", "Equipment maintenance documentation"),
]

USERS = [
    ("ADMIN001", "System Administrator", "admin@edocs.local", "administrator", "Admin@1234"),
    ("ENG001", "Jane Smith", "jane.smith@edocs.local", "engineer", "Password@123"),
    ("SUP001", "Robert Chen", "robert.chen@edocs.local", "supervisor", "Password@123"),
    ("MGR001", "David Reyes", "david.reyes@edocs.local", "manager", "Password@123"),
    ("DC001", "Maria Lopez", "maria.lopez@edocs.local", "document_controller", "Password@123"),
    ("EMP001", "John Williams", "john.williams@edocs.local", "employee", "Password@123"),
    ("INS001", "Sarah Johnson", "sarah.johnson@edocs.local", "inspector", "Password@123"),
]


def seed():
    app = create_app()
    with app.app_context():
        for name, desc in DEPARTMENTS:
            if not Department.query.filter_by(name=name).first():
                db.session.add(Department(name=name, description=desc))
        for name, desc in CATEGORIES:
            if not Category.query.filter_by(name=name).first():
                db.session.add(Category(name=name, description=desc))
        for emp_id, full_name, email, role, password in USERS:
            if not User.query.filter_by(employee_id=emp_id).first():
                db.session.add(User(
                    employee_id=emp_id, full_name=full_name, email=email, role=role,
                    password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt(10)).decode(),
                    status="active", must_change_password=False,
                ))
        db.session.commit()
        print("Seed complete.")
        print("Accounts: ADMIN001/Admin@1234, ENG001|SUP001|DC001|EMP001|INS001 / Password@123")


if __name__ == "__main__":
    seed()
