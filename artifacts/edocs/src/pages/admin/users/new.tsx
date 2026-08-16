import { useState } from "react";
import { useCreateUser, useListDepartments } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function NewUser() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  if (user?.role !== "administrator") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <div className="text-2xl font-mono font-bold text-muted-foreground">ACCESS RESTRICTED</div>
        <p className="text-muted-foreground max-w-md text-sm">
          User registration is only accessible to Administrators.
        </p>
      </div>
    );
  }

  const createMut = useCreateUser();
  const { data: departments } = useListDepartments();

  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<any>("");
  const [departmentId, setDepartmentId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast.error("Role is required");
      return;
    }

    createMut.mutate({
      data: {
        employeeId,
        fullName,
        email,
        password,
        role,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        mustChangePassword: true
      }
    }, {
      onSuccess: () => {
        toast.success("User created successfully");
        setLocation("/admin/users");
      },
      onError: (err: any) => {
        toast.error("Failed to create user", { description: err.message });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/users"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Register User</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Create new system access account</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Account Details</CardTitle>
          <CardDescription>User will be forced to change password on first login</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="employeeId" className="text-xs font-bold uppercase">Employee ID <span className="text-red-500">*</span></Label>
                <Input 
                  id="employeeId" 
                  value={employeeId} 
                  onChange={e => setEmployeeId(e.target.value)} 
                  required
                  placeholder="e.g. EMP001"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase">Full Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="fullName" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase">Email Address <span className="text-red-500">*</span></Label>
                <Input 
                  id="email" 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required
                  placeholder="john.doe@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase">Initial Password <span className="text-red-500">*</span></Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold uppercase">System Role <span className="text-red-500">*</span></Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="font-mono">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">ADMINISTRATOR</SelectItem>
                    <SelectItem value="document_controller">DOCUMENT CONTROLLER</SelectItem>
                    <SelectItem value="supervisor">SUPERVISOR</SelectItem>
                    <SelectItem value="manager">MANAGER</SelectItem>
                    <SelectItem value="engineer">ENGINEER</SelectItem>
                    <SelectItem value="inspector">INSPECTOR</SelectItem>
                    <SelectItem value="employee">EMPLOYEE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold uppercase">Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="ghost" className="mr-2" asChild>
                <Link href="/admin/users">CANCEL</Link>
              </Button>
              <Button type="submit" disabled={createMut.isPending} className="font-bold">
                <Save className="w-4 h-4 mr-2" />
                {createMut.isPending ? "REGISTERING..." : "REGISTER USER"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}