import os
import unittest
from unittest.mock import patch

from email_notifications import (
    get_email_settings,
    send_account_status_email,
    send_registration_email,
    send_request_approved_email,
    send_request_pending_email,
    send_revision_approved_email,
    send_revision_pending_email,
    send_revision_rejected_email,
)


class EmailNotificationTests(unittest.TestCase):
    def setUp(self):
        self.email = "applicant@example.com"
        self.user = type("User", (), {"full_name": "Jane Doe", "email": self.email, "employee_id": "EMP123"})()

    @patch("email_notifications.smtplib.SMTP")
    def test_registration_email_uses_registration_address(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        send_registration_email(self.user)

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], self.email)
        self.assertIn("Registration submitted", message["Subject"])

    @patch("email_notifications.smtplib.SMTP")
    def test_status_email_uses_user_email(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        send_account_status_email(self.user, "approved", "Your access was approved.")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], self.email)
        self.assertIn("approved", message["Subject"].lower())

    @patch("email_notifications.smtplib.SMTP")
    def test_request_pending_email_notifies_supervisor(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        engineer = type("User", (), {"full_name": "Jane Doe", "email": "engineer@example.com", "employee_id": "ENG001"})()
        supervisor = type("User", (), {"full_name": "Supervisor One", "email": "supervisor@example.com", "employee_id": "SUP001"})()

        send_request_pending_email(engineer, [supervisor], "REQ-1001", "Pump drawing")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], "supervisor@example.com")
        self.assertIn("Approval required", message["Subject"])

    @patch("email_notifications.smtplib.SMTP")
    def test_request_approved_email_notifies_engineer(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        engineer = type("User", (), {"full_name": "Jane Doe", "email": "engineer@example.com", "employee_id": "ENG001"})()

        send_request_approved_email(engineer, "REQ-1001", "Supervisor One")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], "engineer@example.com")
        self.assertIn("approved", message["Subject"].lower())

    @patch("email_notifications.smtplib.SMTP")
    def test_revision_pending_email_notifies_stage1_approvers(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        uploader = type("User", (), {"full_name": "Jane Doe", "email": "engineer@example.com", "employee_id": "ENG001"})()
        approver = type("User", (), {"full_name": "Supervisor One", "email": "supervisor@example.com", "employee_id": "SUP001"})()

        send_revision_pending_email(uploader, [approver], "DOC-1001", "REV-02")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], "supervisor@example.com")
        self.assertIn("Review required", message["Subject"])

    @patch("email_notifications.smtplib.SMTP")
    def test_revision_approved_email_notifies_uploader(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        uploader = type("User", (), {"full_name": "Jane Doe", "email": "engineer@example.com", "employee_id": "ENG001"})()

        send_revision_approved_email(uploader, "DOC-1001", "REV-02", "Supervisor One")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], "engineer@example.com")
        self.assertIn("approved", message["Subject"].lower())

    @patch("email_notifications.smtplib.SMTP")
    def test_revision_rejected_email_notifies_uploader(self, smtp_cls):
        os.environ["EMAIL_FROM"] = "noreply@edocs.local"
        os.environ["SMTP_HOST"] = "smtp.example.com"
        os.environ["SMTP_PORT"] = "587"
        os.environ["SMTP_USERNAME"] = "smtp-user"
        os.environ["SMTP_PASSWORD"] = "smtp-pass"
        os.environ["SMTP_USE_TLS"] = "true"

        uploader = type("User", (), {"full_name": "Jane Doe", "email": "engineer@example.com", "employee_id": "ENG001"})()

        send_revision_rejected_email(uploader, "DOC-1001", "REV-02", "Supervisor One", "Missing approval comments")

        smtp = smtp_cls.return_value
        smtp.send_message.assert_called_once()
        message = smtp.send_message.call_args[0][0]
        self.assertEqual(message["To"], "engineer@example.com")
        self.assertIn("rejected", message["Subject"].lower())

    def test_database_email_settings_override_env(self):
        from app import create_app
        from models import EmailSetting, db

        app = create_app()
        with app.app_context():
            EmailSetting.query.delete()
            db.session.add(EmailSetting(key="SMTP_HOST", value="smtp.admin.local"))
            db.session.add(EmailSetting(key="SMTP_PORT", value="2525"))
            db.session.add(EmailSetting(key="SMTP_USERNAME", value="admin-user"))
            db.session.add(EmailSetting(key="SMTP_PASSWORD", value="admin-pass"))
            db.session.add(EmailSetting(key="SMTP_USE_TLS", value="true"))
            db.session.add(EmailSetting(key="EMAIL_FROM", value="noreply@admin.local"))
            db.session.commit()

            settings = get_email_settings()
            self.assertEqual(settings["host"], "smtp.admin.local")
            self.assertEqual(settings["port"], 2525)
            self.assertEqual(settings["username"], "admin-user")
            self.assertEqual(settings["from_email"], "noreply@admin.local")


if __name__ == "__main__":
    unittest.main()
