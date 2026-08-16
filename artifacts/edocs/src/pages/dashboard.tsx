import { useGetDashboardStats, useGetDocumentStatusBreakdown, useGetPrintActivity, useGetTopDocuments, useGetRecentActivity, useListDocuments, useListUsers } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText, CheckCircle, Clock, Archive, Printer, Send, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatDate } from "@/lib/format";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isStage1Approver = ["administrator", "document_controller", "supervisor"].includes(role);
  const isFinalApprover = ["administrator", "manager"].includes(role);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: awaitingReview } = useListDocuments({ status: "under_review", limit: 10 } as any, { query: { enabled: isStage1Approver } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: awaitingFinal } = useListDocuments({ status: "manager_review", limit: 10 } as any, { query: { enabled: isFinalApprover } as any });
  const isAdmin = role === "administrator";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pendingUsers } = useListUsers({ status: "pending" } as any, { query: { enabled: isAdmin } as any });
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity } = useGetRecentActivity({ limit: 8 });
  const { data: statusBreakdown } = useGetDocumentStatusBreakdown();
  const { data: printActivity } = useGetPrintActivity();
  const { data: topDocs } = useGetTopDocuments({ limit: 5 });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Terminal Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terminal Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">System status and key metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Docs" value={stats.totalDocuments} icon={FileText} href="/documents" />
        <StatCard title="Approved" value={stats.approvedDocuments} icon={CheckCircle} className="text-emerald-600" href="/documents?status=approved" />
        <StatCard title="Pending" value={stats.pendingApprovals} icon={Clock} className="text-amber-600" href="/documents?status=under_review" />
        <StatCard title="Obsolete" value={stats.obsoleteDocuments} icon={Archive} className="text-slate-500" href="/documents?status=obsolete" />
        <StatCard title="Prints Today" value={stats.todayPrints} icon={Printer} className="text-blue-600" href="/print-history" />
        <StatCard title="Reqs Today" value={stats.todayRequests} icon={Send} className="text-indigo-600" href="/requests" />
      </div>

      {isAdmin && (pendingUsers?.length ?? 0) > 0 && (
        <Link href="/admin/users?tab=pending" className="block">
          <div className="flex items-center gap-4 rounded-sm border border-sky-300 bg-sky-50/70 px-5 py-4 hover:bg-sky-100/70 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-sm bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-sky-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">
                {pendingUsers!.length} account registration{pendingUsers!.length > 1 ? "s" : ""} waiting for your approval
              </div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">
                {pendingUsers!.map((u: any) => u.fullName).slice(0, 3).join(", ")}
                {pendingUsers!.length > 3 ? ` and ${pendingUsers!.length - 3} more` : ""} — click to review
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider bg-sky-100 text-sky-800 border-sky-200 shrink-0">
              Pending
            </Badge>
          </div>
        </Link>
      )}

      {isStage1Approver && (awaitingReview?.data?.length ?? 0) > 0 && (
        <ApprovalInbox
          title="Waiting for Your Approval"
          subtitle="Documents submitted by engineers — open one to approve or reject"
          docs={awaitingReview!.data}
          accent="border-amber-300 bg-amber-50/50"
        />
      )}
      {isFinalApprover && (awaitingFinal?.data?.length ?? 0) > 0 && (
        <ApprovalInbox
          title="Waiting for Final Approval"
          subtitle="Approved by supervisor — needs your final sign-off to issue the QR code"
          docs={awaitingFinal!.data}
          accent="border-purple-300 bg-purple-50/50"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Print Activity (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] w-full">
              {printActivity && printActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={printActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '2px', border: '1px solid #e2e8f0', fontSize: '12px', fontFamily: 'monospace' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">No print data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] w-full">
              {statusBreakdown && statusBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusBreakdown.map((entry, index) => {
                        const statusColors: Record<string, string> = {
                          'approved': '#10b981',
                          'draft': '#94a3b8',
                          'submitted': '#3b82f6',
                          'under_review': '#f59e0b',
                          'obsolete': '#f97316',
                          'rejected': '#ef4444'
                        };
                        return <Cell key={`cell-${index}`} fill={statusColors[entry.status.toLowerCase()] || '#cbd5e1'} />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '2px', border: '1px solid #e2e8f0', fontSize: '12px', fontFamily: 'monospace' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-sm">No status data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Top Printed Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document No</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Prints</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDocs?.map((doc) => (
                  <TableRow key={doc.documentId}>
                    <TableCell className="font-mono font-medium">{doc.documentNumber}</TableCell>
                    <TableCell className="truncate max-w-[200px]">{doc.title}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-mono">{doc.printCount}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!topDocs || topDocs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground font-mono text-xs">
                      No documents found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y border-t-0">
              {activity?.map((item) => (
                <div key={item.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                  <div className="mt-0.5">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-semibold">{item.userName}</span> {item.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span>{formatDate(item.createdAt)}</span>
                      {item.documentNumber && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-bold">{item.documentNumber}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!activity || activity.length === 0) && (
                <div className="text-center py-8 text-muted-foreground font-mono text-xs">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ApprovalInbox({ title, subtitle, docs, accent }: any) {
  return (
    <Card className={`shadow-md ${accent}`}>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" /> {title}
          <Badge variant="secondary" className="ml-1 font-mono">{docs.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{subtitle}</p>
      </CardHeader>
      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-mono">DOC NO.</TableHead>
              <TableHead className="text-xs font-mono">TITLE</TableHead>
              <TableHead className="text-xs font-mono">STATUS</TableHead>
              <TableHead className="text-xs font-mono">UPDATED</TableHead>
              <TableHead className="text-right text-xs font-mono">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {docs.map((doc: any) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-sm">{doc.documentNumber}</TableCell>
                <TableCell className="text-sm">{doc.title}</TableCell>
                <TableCell><StatusBadge status={doc.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(doc.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/documents/${doc.id}`}>
                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-700 transition-colors">
                      Review &amp; Approve
                    </button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function StatCard({ title, value, icon: Icon, className = "text-muted-foreground", href }: any) {
  const card = (
    <Card className={`shadow-md border-slate-200 ${href ? "cursor-pointer transition-all hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded bg-slate-50 ${className}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
  if (href) return <Link href={href} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">{card}</Link>;
  return card;
}

function ActivityIcon({ type }: { type: string }) {
  const base = "w-7 h-7 rounded-sm flex items-center justify-center shrink-0";
  switch (type) {
    case 'LOGIN': return <div className={`${base} bg-slate-100 text-slate-500`}><Clock className="w-4 h-4" /></div>;
    case 'DOCUMENT_CREATED': return <div className={`${base} bg-blue-100 text-blue-600`}><FileText className="w-4 h-4" /></div>;
    case 'REVISION_UPLOADED': return <div className={`${base} bg-indigo-100 text-indigo-600`}><FileText className="w-4 h-4" /></div>;
    case 'REVISION_APPROVED': return <div className={`${base} bg-emerald-100 text-emerald-600`}><CheckCircle className="w-4 h-4" /></div>;
    case 'DOCUMENT_PRINTED': return <div className={`${base} bg-slate-100 text-slate-800`}><Printer className="w-4 h-4" /></div>;
    case 'USER_CREATED': return <div className={`${base} bg-purple-100 text-purple-600`}><Users className="w-4 h-4" /></div>;
    default: return <div className={`${base} bg-slate-100 text-slate-500`}><Clock className="w-4 h-4" /></div>;
  }
}