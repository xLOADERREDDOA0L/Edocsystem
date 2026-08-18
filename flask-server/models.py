"""SQLAlchemy models — SQLite port of the original PostgreSQL schema."""
from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Text, unique=True, nullable=False)
    full_name = db.Column(db.Text)
    email = db.Column(db.Text, unique=True)
    password_hash = db.Column(db.Text)
    role = db.Column(db.Text, default="employee")
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    status = db.Column(db.Text, default="active")
    must_change_password = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime(timezone=True))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    department = db.relationship("Department")


class Department(db.Model):
    __tablename__ = "departments"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    status = db.Column(db.Text, default="active")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    status = db.Column(db.Text, default="active")
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)


class Document(db.Model):
    __tablename__ = "documents"
    id = db.Column(db.Integer, primary_key=True)
    document_number = db.Column(db.Text, unique=True)
    title = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id"))
    description = db.Column(db.Text)
    status = db.Column(db.Text, default="draft")
    current_revision_id = db.Column(db.Integer)  # intentionally no FK (parity with original)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    category = db.relationship("Category")
    department = db.relationship("Department")
    creator = db.relationship("User")


class Revision(db.Model):
    __tablename__ = "document_revisions"
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"))
    revision_number = db.Column(db.Text)
    file_path = db.Column(db.Text)
    file_name = db.Column(db.Text)
    file_hash = db.Column(db.Text)
    status = db.Column(db.Text, default="draft")
    effective_date = db.Column(db.Text)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    approved_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    approval_date = db.Column(db.DateTime(timezone=True))
    rejection_reason = db.Column(db.Text)
    approval_comments = db.Column(db.Text)
    qr_token = db.Column(db.Text, unique=True)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    document = db.relationship("Document", foreign_keys=[document_id])
    uploader = db.relationship("User", foreign_keys=[uploaded_by])
    approver = db.relationship("User", foreign_keys=[approved_by])


class DocumentRequest(db.Model):
    __tablename__ = "document_requests"
    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.Text, unique=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"))
    revision_id = db.Column(db.Integer, db.ForeignKey("document_revisions.id"))
    requested_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    purpose = db.Column(db.Text)
    number_of_copies = db.Column(db.Integer, default=1)
    status = db.Column(db.Text, default="pending")
    rejection_reason = db.Column(db.Text)
    requested_at = db.Column(db.DateTime(timezone=True), default=utcnow)
    approved_at = db.Column(db.DateTime(timezone=True))

    document = db.relationship("Document")
    revision = db.relationship("Revision")
    requester = db.relationship("User")


class PrintTransaction(db.Model):
    __tablename__ = "print_transactions"
    id = db.Column(db.Integer, primary_key=True)
    transaction_number = db.Column(db.Text, unique=True)
    document_id = db.Column(db.Integer, db.ForeignKey("documents.id"))
    revision_id = db.Column(db.Integer, db.ForeignKey("document_revisions.id"))
    employee_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    copy_number = db.Column(db.Text)
    number_of_copies = db.Column(db.Integer, default=1)
    qr_token = db.Column(db.Text, unique=True)
    status = db.Column(db.Text, default="completed")
    purpose = db.Column(db.Text)
    ip_address = db.Column(db.Text)
    printed_at = db.Column(db.DateTime(timezone=True), default=utcnow)

    document = db.relationship("Document")
    revision = db.relationship("Revision")
    employee = db.relationship("User")


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer)  # intentionally no FK (parity with original)
    action = db.Column(db.Text)
    module = db.Column(db.Text)
    description = db.Column(db.Text)
    record_type = db.Column(db.Text)
    record_id = db.Column(db.Integer)
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    ip_address = db.Column(db.Text)
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow)


class EmailSetting(db.Model):
    __tablename__ = "email_settings"
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.Text, unique=True, nullable=False)
    value = db.Column(db.Text)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow)
