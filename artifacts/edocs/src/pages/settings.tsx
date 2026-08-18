import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Building, Lock, ServerCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { toast } from "sonner";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const defaultEmailConfig = {
  host: "",
  port: "587",
  username: "",
  password: "",
  useTls: false,
  useSsl: false,
  fromEmail: "",
};

export default function Settings() {
  const { user } = useAuth();
  const [emailConfig, setEmailConfig] = useState(defaultEmailConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "administrator") return;
    const loadSettings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("edocs_token");
        const res = await fetch(`${BASE}/api/settings/email`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Unable to load email settings");
        const data = await res.json();
        setEmailConfig({
          host: data.host ?? "",
          port: String(data.port ?? 587),
          username: data.username ?? "",
          password: data.password ?? "",
          useTls: Boolean(data.useTls),
          useSsl: Boolean(data.useSsl),
          fromEmail: data.fromEmail ?? "",
        });
      } catch (err: any) {
        toast.error("Could not load SMTP settings", { description: err.message });
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [user?.role]);

  const handleSave = async () => {
    if (user?.role !== "administrator") return;

    setSaving(true);
    try {
      const token = localStorage.getItem("edocs_token");
      const res = await fetch(`${BASE}/api/settings/email`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          host: emailConfig.host,
          port: Number(emailConfig.port) || 587,
          username: emailConfig.username,
          password: emailConfig.password,
          useTls: emailConfig.useTls,
          useSsl: emailConfig.useSsl,
          fromEmail: emailConfig.fromEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update SMTP settings");
      setEmailConfig({
        host: data.host ?? "",
        port: String(data.port ?? 587),
        username: data.username ?? "",
        password: data.password ?? "",
        useTls: Boolean(data.useTls),
        useSsl: Boolean(data.useSsl),
        fromEmail: data.fromEmail ?? "",
      });
      toast.success("SMTP settings saved successfully");
    } catch (err: any) {
      toast.error("Failed to save SMTP settings", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Terminal Access Configuration</p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Account Information</CardTitle>
          <CardDescription>Your current system access privileges</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded bg-slate-900 flex items-center justify-center text-white text-3xl font-bold font-mono shadow-inner">
                {user.fullName.charAt(0)}
              </div>
              <Badge variant="outline" className={`font-mono uppercase tracking-wider text-[10px] ${user.status === 'active' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                {user.status}
              </Badge>
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-[30px_1fr] items-center text-sm border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">Full Name</div>
                  <div className="font-medium text-slate-900">{user.fullName}</div>
                </div>
              </div>

              <div className="grid grid-cols-[30px_1fr] items-center text-sm border-b border-slate-100 pb-3">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">Employee ID</div>
                  <div className="font-mono text-slate-900 font-bold">{user.employeeId}</div>
                </div>
              </div>

              <div className="grid grid-cols-[30px_1fr] items-center text-sm border-b border-slate-100 pb-3">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">Email Address</div>
                  <div className="text-slate-900">{user.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-[30px_1fr] items-center text-sm border-b border-slate-100 pb-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">System Role</div>
                  <div className="font-mono uppercase tracking-wider text-slate-900">{user.role.replace("_", " ")}</div>
                </div>
              </div>

              <div className="grid grid-cols-[30px_1fr] items-center text-sm pb-3">
                <Building className="w-4 h-4 text-slate-400" />
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-0.5">Department</div>
                  <div className="uppercase tracking-wider text-slate-900 text-xs">{user.departmentName || "Unassigned"}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === "administrator" && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <ServerCog className="w-4 h-4" /> SMTP Configuration
                </CardTitle>
                <CardDescription>Manage outbound email settings used for approval and registration notifications</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {loading ? (
              <div className="text-sm text-slate-500">Loading SMTP settings…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host" className="text-xs font-bold uppercase">SMTP Host</Label>
                    <Input id="smtp-host" value={emailConfig.host} onChange={(e) => setEmailConfig({ ...emailConfig, host: e.target.value })} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port" className="text-xs font-bold uppercase">SMTP Port</Label>
                    <Input id="smtp-port" type="number" value={emailConfig.port} onChange={(e) => setEmailConfig({ ...emailConfig, port: e.target.value })} placeholder="587" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-username" className="text-xs font-bold uppercase">Username</Label>
                    <Input id="smtp-username" value={emailConfig.username} onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })} placeholder="you@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-from" className="text-xs font-bold uppercase">From Email</Label>
                    <Input id="smtp-from" type="email" value={emailConfig.fromEmail} onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })} placeholder="noreply@company.com" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="smtp-password" className="text-xs font-bold uppercase">Password</Label>
                    <Input id="smtp-password" type="password" value={emailConfig.password} onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })} placeholder="App password or SMTP password" />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Use STARTTLS</div>
                      <div className="text-xs text-slate-500">Enable for standard TLS SMTP connections</div>
                    </div>
                    <Switch checked={emailConfig.useTls} onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, useTls: checked })} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Use implicit SSL</div>
                      <div className="text-xs text-slate-500">Use SMTPS on dedicated SSL ports</div>
                    </div>
                    <Switch checked={emailConfig.useSsl} onCheckedChange={(checked) => setEmailConfig({ ...emailConfig, useSsl: checked })} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="font-bold">
                    {saving ? "SAVING..." : "SAVE SMTP SETTINGS"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Security</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <div className="font-bold text-sm text-slate-900">Access Credentials</div>
            <div className="text-xs text-slate-500 mt-1">Update your terminal login password to maintain security</div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/change-password"><Lock className="w-4 h-4 mr-2" /> CHANGE PASSWORD</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}