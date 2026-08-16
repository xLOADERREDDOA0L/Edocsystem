import { useState } from "react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { QrCode, ShieldCheck, FileCheck2, ScanLine, BookOpen } from "lucide-react";
import { Link } from "wouter";
import loginBg from "@/assets/login-bg.jpg";

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username: employeeId, password } },
      {
        onSuccess: (res) => {
          login(res.token);
          toast.success("Authentication successful");
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect");
          setLocation(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
        },
        onError: (err) => {
          toast.error("Authentication failed", { description: err.message });
        }
      }
    );
  };

  return (
    <div className="min-h-screen relative flex font-sans">
      {/* Background image + gradient overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-indigo-950/70"
        aria-hidden="true"
      />

      {/* Left panel — brand / product pitch (hidden on small screens) */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between flex-1 p-14 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 backdrop-blur border border-white/20 rounded-sm flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight leading-none">eDocs Control</div>
              <div className="text-[10px] font-mono tracking-widest text-slate-300 mt-1">ENGINEERING DOCUMENT DISTRIBUTION</div>
            </div>
          </div>
          <Link href="/how-to-use" className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-300 hover:text-white border border-white/20 bg-white/5 backdrop-blur px-4 py-2.5 rounded-sm transition-colors">
            <BookOpen className="w-4 h-4" /> How to Use
          </Link>
        </div>

        <div className="max-w-lg space-y-8">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Every drawing controlled.<br />
            Every copy <span className="text-sky-400">verified</span>.
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md">
            Smart document control and distribution for engineering teams —
            from upload and approval to controlled printing with QR-coded
            copies and a full audit trail.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: FileCheck2, label: "Revision Control" },
              { icon: ScanLine, label: "QR Verification" },
              { icon: ShieldCheck, label: "Full Audit Trail" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="bg-white/5 backdrop-blur border border-white/10 rounded-sm p-4 space-y-2">
                <Icon className="w-5 h-5 text-sky-400" />
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-200 leading-snug">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          Unauthorized access is strictly prohibited
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="relative z-10 w-full lg:max-w-xl flex items-center justify-center p-4 sm:p-10 lg:bg-slate-950/40 lg:backdrop-blur-md lg:border-l lg:border-white/10">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only brand header */}
          <div className="flex justify-end lg:hidden">
            <Link href="/how-to-use" className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-300 hover:text-white border border-white/20 bg-white/5 backdrop-blur px-3 py-2 rounded-sm transition-colors">
              <BookOpen className="w-4 h-4" /> How to Use
            </Link>
          </div>
          <div className="text-center space-y-3 lg:hidden">
            <div className="w-14 h-14 bg-white/10 backdrop-blur border border-white/20 rounded-sm mx-auto flex items-center justify-center">
              <QrCode className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">eDocs Control</h1>
              <p className="text-xs text-slate-300 font-mono tracking-widest mt-1">ENGINEERING DOCUMENT DISTRIBUTION</p>
            </div>
          </div>

          <Card className="border-white/10 bg-white/95 backdrop-blur shadow-2xl rounded-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-slate-700" />
            <CardContent className="pt-8 pb-8 px-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Authentication</h2>
                <p className="text-sm text-slate-500 mt-1">Enter credentials to access the terminal</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="employeeId" className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee ID</Label>
                  <Input
                    id="employeeId"
                    placeholder="e.g. EMP12345"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    required
                    className="font-mono bg-slate-50 border-slate-300 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="font-mono bg-slate-50 border-slate-300 h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-bold uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Authenticating..." : "Login to Terminal"}
                </Button>
              </form>
              <div className="mt-5 pt-4 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  No account yet?{" "}
                  <Link href="/register" className="font-semibold text-sky-600 hover:text-sky-700 underline underline-offset-2">
                    Request access
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* TEMP: sample credentials for testing — remove before production */}
          <Card className="border-dashed border-amber-400/40 bg-amber-950/30 backdrop-blur rounded-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2">Sample Accounts (dev only)</p>
              <div className="grid grid-cols-1 gap-1 text-xs font-mono text-slate-200">
                {[
                  ["ADMIN001", "Admin@1234", "Administrator"],
                  ["DC001", "Password@123", "Document Controller"],
                  ["ENG001", "Password@123", "Engineer"],
                  ["SUP001", "Password@123", "Supervisor"],
                  ["MGR001", "Password@123", "Manager"],
                  ["EMP001", "Password@123", "Employee"],
                  ["INS001", "Password@123", "Inspector"],
                ].map(([id, pw, role]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setEmployeeId(id); setPassword(pw); }}
                    className="flex justify-between items-center px-2 py-1 rounded-sm hover:bg-white/10 text-left"
                  >
                    <span className="font-bold">{id}</span>
                    <span className="text-slate-400">{pw}</span>
                    <span className="text-[10px] uppercase text-amber-400">{role}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-amber-500/80 mt-2">Click a row to auto-fill the form</p>
            </CardContent>
          </Card>

          <p className="text-center text-[10px] text-slate-400 font-mono tracking-widest uppercase lg:hidden">
            Unauthorized access is strictly prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
