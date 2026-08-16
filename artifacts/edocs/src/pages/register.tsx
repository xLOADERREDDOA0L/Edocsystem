import { useState } from "react";
import { useListDepartments } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { QrCode, ArrowLeft, CheckCircle2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Register() {
  const [, setLocation] = useLocation();
  const { data: departments } = useListDepartments();

  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employeeId.trim().toUpperCase(),
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          departmentId: departmentId ? parseInt(departmentId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess(true);
    } catch (err: any) {
      toast.error("Registration failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center font-sans">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/80 to-indigo-950/70"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg px-4 py-10 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-white/10 backdrop-blur border border-white/20 rounded-sm mx-auto flex items-center justify-center">
            <QrCode className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">eDocs Control</h1>
            <p className="text-[10px] text-slate-300 font-mono tracking-widest mt-0.5">ENGINEERING DOCUMENT DISTRIBUTION</p>
          </div>
        </div>

        <Card className="border-white/10 bg-white/95 backdrop-blur shadow-2xl rounded-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-slate-700" />
          <CardContent className="pt-8 pb-8 px-8">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Registration Submitted</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Your account request has been sent to the administrator.<br />
                    You will be able to log in once your account is approved.
                  </p>
                </div>
                <Button
                  className="w-full h-11 font-bold uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800"
                  onClick={() => setLocation("/login")}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center gap-3">
                  <Link href="/login" className="text-slate-400 hover:text-slate-700 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Request access to eDocs Control</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="employeeId" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Employee ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="employeeId"
                        placeholder="e.g. EMP001"
                        value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        required
                        className="font-mono uppercase bg-slate-50 border-slate-300 h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        placeholder="Juan dela Cruz"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required
                        className="bg-slate-50 border-slate-300 h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="bg-slate-50 border-slate-300 h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wider text-slate-500">Role</Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="role" className="bg-slate-50 border-slate-300 h-10 font-mono text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="engineer">Engineer</SelectItem>
                          <SelectItem value="inspector">Inspector</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</Label>
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger id="department" className="bg-slate-50 border-slate-300 h-10 text-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {departments?.map(d => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="font-mono bg-slate-50 border-slate-300 h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Confirm <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        className="font-mono bg-slate-50 border-slate-300 h-10"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Your request will be reviewed by an administrator. You will only be able to log in after approval.
                    Privileged roles (Administrator, Supervisor, DC, Manager) can only be assigned by an admin after registration.
                  </p>

                  <Button
                    type="submit"
                    className="w-full h-11 font-bold uppercase tracking-widest text-xs bg-slate-900 hover:bg-slate-800"
                    disabled={loading}
                  >
                    {loading ? "Submitting..." : "Submit Registration"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          Unauthorized access is strictly prohibited
        </p>
      </div>
    </div>
  );
}
