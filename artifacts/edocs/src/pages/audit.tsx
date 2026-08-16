import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { Search, History, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_ROLES = ["administrator", "document_controller"];

export default function AuditTrail() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListAuditLogs({ page, limit: 30 }, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: ALLOWED_ROLES.includes(user?.role ?? "") } as any
  });

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('approve') || a.includes('login')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (a.includes('delete') || a.includes('reject') || a.includes('disable')) return 'bg-red-100 text-red-800 border-red-200';
    if (a.includes('update') || a.includes('submit')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  if (!ALLOWED_ROLES.includes(user?.role ?? "")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <div className="text-2xl font-mono font-bold text-muted-foreground">ACCESS RESTRICTED</div>
        <p className="text-muted-foreground max-w-md text-sm">
          The Audit Trail is only accessible to Administrators and Document Controllers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Audit Trail</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Immutable system event log</p>
      </div>

      <Card>
        <CardHeader className="border-b bg-slate-50 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4" /> System Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">User</TableHead>
                <TableHead className="w-[120px]">Module</TableHead>
                <TableHead className="w-[120px]">Action</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[130px] text-right">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 font-mono text-xs">SCANNING AUDIT LEDGER...</TableCell></TableRow>
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-xs">
                    NO LOGS RECORDED
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs text-slate-600">{formatDate(log.createdAt)}</TableCell>
                    <TableCell className="font-medium text-xs truncate max-w-[150px]">{log.userName}</TableCell>
                    <TableCell className="text-xs uppercase font-mono tracking-wider text-slate-500">{log.module}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{log.description}</TableCell>
                    <TableCell className="font-mono text-[10px] text-right text-slate-400">{log.ipAddress}</TableCell>
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
