import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Building, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Settings() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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