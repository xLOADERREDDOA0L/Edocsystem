import { useEffect, useState } from "react";
import { useListUsers, useDisableUser, useEnableUser } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, UserX, UserCheck, ShieldOff, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_ROLES = ["administrator", "document_controller", "supervisor"];
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "active" | "pending" | "disabled";

async function postUserAction(token: string, userId: number, action: string) {
  const res = await fetch(`${BASE}/api/users/${userId}/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Operation failed");
  }
  return res.json();
}

export default function UsersList() {
  const { user } = useAuth();
  const token = localStorage.getItem("edocs_token");
  const [tab, setTab] = useState<Tab>("active");
  const isAdmin = user?.role === "administrator";
  const search = useSearch();

  useEffect(() => {
    const t = new URLSearchParams(search).get("tab");
    if (isAdmin && (t === "pending" || t === "disabled" || t === "active")) setTab(t as Tab);
  }, [search, isAdmin]);

  const { data: activeUsers, isLoading: loadingActive, refetch: refetchActive } = useListUsers(
    { status: "active" } as any,
    { query: { enabled: ALLOWED_ROLES.includes(user?.role ?? "") } as any }
  );
  const { data: pendingUsers, isLoading: loadingPending, refetch: refetchPending } = useListUsers(
    { status: "pending" } as any,
    { query: { enabled: isAdmin } as any }
  );
  const { data: disabledUsers, isLoading: loadingDisabled, refetch: refetchDisabled } = useListUsers(
    { status: "disabled" } as any,
    { query: { enabled: isAdmin } as any }
  );

  const disableMut = useDisableUser();
  const enableMut = useEnableUser();

  if (!ALLOWED_ROLES.includes(user?.role ?? "")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <div className="text-2xl font-mono font-bold text-muted-foreground">ACCESS RESTRICTED</div>
        <p className="text-muted-foreground max-w-md text-sm">
          User Management is only accessible to Administrators, Document Controllers, and Supervisors.
        </p>
      </div>
    );
  }

  const handleDisable = async (id: number) => {
    try {
      await disableMut.mutateAsync({ id });
      toast.success("User disabled");
      refetchActive(); refetchDisabled();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  };

  const handleEnable = async (id: number) => {
    try {
      await enableMut.mutateAsync({ id });
      toast.success("User enabled");
      refetchDisabled(); refetchActive();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  };

  const handleApprove = async (id: number) => {
    try {
      await postUserAction(token!, id, "approve");
      toast.success("Account approved — user can now log in");
      refetchPending(); refetchActive();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  };

  const handleReject = async (id: number) => {
    try {
      await postUserAction(token!, id, "reject");
      toast.success("Registration rejected");
      refetchPending(); refetchDisabled();
    } catch (err: any) { toast.error("Failed", { description: err.message }); }
  };

  const tabs: { key: Tab; label: string; count?: number; color: string }[] = [
    { key: "active", label: "Active", count: activeUsers?.length, color: "emerald" },
    { key: "pending", label: "Pending Approval", count: pendingUsers?.length, color: "amber" },
    { key: "disabled", label: "Disabled", count: disabledUsers?.length, color: "red" },
  ];

  const currentData = tab === "active" ? activeUsers : tab === "pending" ? pendingUsers : disabledUsers;
  const currentLoading = tab === "active" ? loadingActive : tab === "pending" ? loadingPending : loadingDisabled;

  const statusStyle: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    disabled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">System access control</p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/admin/users/new"><Plus className="w-4 h-4 mr-2" /> NEW USER</Link>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map(t => {
          if (!isAdmin && t.key !== "active") return null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-px ${
                tab === t.key
                  ? t.key === "pending"
                    ? "border-amber-500 text-amber-700"
                    : t.key === "disabled"
                    ? "border-red-500 text-red-700"
                    : "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.key === "pending" ? <Clock className="w-3.5 h-3.5" /> : t.key === "disabled" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  t.key === "pending" ? "bg-amber-100 text-amber-800" :
                  t.key === "disabled" ? "bg-red-100 text-red-800" :
                  "bg-slate-100 text-slate-700"
                }`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pending notice */}
      {tab === "pending" && (pendingUsers?.length ?? 0) > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-sm px-4 py-3 text-sm text-amber-800">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>These users registered themselves and are waiting for your approval before they can log in. Review their details and approve or reject each request.</span>
        </div>
      )}

      <Card>
        <CardHeader className="border-b bg-slate-50 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">
            {tab === "active" ? "Active Accounts" : tab === "pending" ? "Pending Registration Requests" : "Disabled Accounts"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">EMP ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[150px]">{tab === "pending" ? "Registered" : "Last Login"}</TableHead>
                <TableHead className="text-right w-[130px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 font-mono text-xs">LOADING...</TableCell></TableRow>
              ) : !currentData?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-xs">
                    {tab === "pending" ? "NO PENDING REQUESTS" : tab === "disabled" ? "NO DISABLED ACCOUNTS" : "NO USERS FOUND"}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono font-bold text-xs">{u.employeeId}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{u.fullName}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono uppercase tracking-wider text-slate-600">
                      {u.role.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-xs">{u.departmentName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${statusStyle[u.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(tab === "pending" ? u.createdAt : u.lastLogin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {tab === "pending" && isAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleApprove(u.id)}
                            title="Approve"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleReject(u.id)}
                            title="Reject"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : tab === "active" && isAdmin ? (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDisable(u.id)}
                          title="Disable User"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      ) : tab === "disabled" && isAdmin ? (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleEnable(u.id)}
                          title="Re-enable User"
                          className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
