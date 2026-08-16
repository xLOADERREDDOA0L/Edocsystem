import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  QrCode, ArrowLeft, LogIn, FileUp, ClipboardCheck, Printer,
  ScanLine, LayoutDashboard, Users, FileSearch,
} from "lucide-react";

const steps = [
  {
    icon: LogIn,
    title: "1. Log in with your Employee ID",
    body: "Enter your Employee ID and password on the login page. Your account is created by the Administrator, and your role (Engineer, Supervisor, Document Controller, Employee, or Inspector) determines what you can do. If it's your first login after a password reset, you'll be asked to set a new password.",
  },
  {
    icon: LayoutDashboard,
    title: "2. Check your dashboard",
    body: "After logging in you land on the dashboard — live stats on documents, pending approvals, print activity, and recent actions across the system.",
  },
  {
    icon: FileUp,
    title: "3. Create a document & upload a revision (Engineers)",
    body: "Go to Documents → New Document, fill in the title, document number, category, and department. Then open the document and upload a PDF revision. When it's ready, submit the revision for review.",
  },
  {
    icon: ClipboardCheck,
    title: "4. Review & approve (Supervisors / Document Controllers)",
    body: "Submitted revisions appear for approval. Approve to make the revision the current controlled version — older revisions are automatically marked obsolete. Reject to send it back with remarks.",
  },
  {
    icon: FileSearch,
    title: "5. Request access to documents (Employees)",
    body: "If you need a document, submit a request from the Requests page. A Supervisor or Document Controller approves or rejects it, and you can track the status anytime.",
  },
  {
    icon: Printer,
    title: "6. Print controlled copies",
    body: "From an approved document, use Print Control to issue a physical copy. Each copy gets its own unique QR code, printed on the confirmation screen. The system warns you if you're about to print a duplicate copy.",
  },
  {
    icon: ScanLine,
    title: "7. Verify any printed copy by scanning its QR code",
    body: "Anyone can scan the QR code on a printed document with a phone camera — no login needed. The result shows instantly: VALID (current revision), OBSOLETE (superseded — do not use), or INVALID (unknown copy, possibly counterfeit).",
  },
  {
    icon: Users,
    title: "8. Monitor everything (Admins / Document Controllers)",
    body: "Use Reports for printing, distribution, and revision summaries, and the Audit Trail to see every action — who did what and when. Admins manage users, departments, and categories from the Admin section.",
  },
];

export default function HowToUse() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Top bar */}
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold leading-none">eDocs Control</div>
              <div className="text-[9px] font-mono tracking-widest text-slate-400 mt-0.5">HOW TO USE</div>
            </div>
          </div>
          <Link href="/login">
            <Button variant="outline" size="sm" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-mono text-xs uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">How to use the system</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
            eDocs Control manages the full life of an engineering document — from
            upload and approval to controlled printing and QR verification. Follow
            the steps below; what you see in the app depends on your role.
          </p>
        </div>

        <div className="space-y-4">
          {steps.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="bg-white/5 border-white/10 rounded-sm">
              <CardContent className="p-5 flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-sky-500/15 border border-sky-500/30 rounded-sm flex items-center justify-center">
                  <Icon className="w-5 h-5 text-sky-400" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="font-bold text-white leading-snug">{title}</h2>
                  <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="pt-4 text-center">
          <Link href="/login">
            <Button className="h-11 px-8 font-bold uppercase tracking-widest text-xs bg-sky-600 hover:bg-sky-500">
              Get Started — Log In
            </Button>
          </Link>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase pb-8">
          EDOCS Control System — Engineering Document Distribution
        </p>
      </main>
    </div>
  );
}
