import { useGetPrintingReport, useGetDistributionReport, useGetRevisionReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldOff } from "lucide-react";

const ALLOWED_ROLES = ["administrator", "document_controller", "supervisor", "manager"];

export default function Reports() {
  const { user } = useAuth();
  const allowed = ALLOWED_ROLES.includes(user?.role ?? "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: printReport } = useGetPrintingReport({}, { query: { enabled: allowed } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: distReport } = useGetDistributionReport({}, { query: { enabled: allowed } as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: revReport } = useGetRevisionReport({ query: { enabled: allowed } as any });

  if (!allowed) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <div className="text-2xl font-mono font-bold text-muted-foreground">ACCESS RESTRICTED</div>
        <p className="text-muted-foreground max-w-md text-sm">
          Analytics & Reports are only accessible to Administrators, Document Controllers, and Supervisors.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">System metrics and distribution statistics</p>
      </div>

      <Tabs defaultValue="printing" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-3 mb-6">
          <TabsTrigger value="printing" className="font-mono text-[10px] tracking-widest">PRINTING</TabsTrigger>
          <TabsTrigger value="distribution" className="font-mono text-[10px] tracking-widest">DISTRIBUTION</TabsTrigger>
          <TabsTrigger value="revisions" className="font-mono text-[10px] tracking-widest">REVISIONS</TabsTrigger>
        </TabsList>
        
        <TabsContent value="printing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Total Prints" value={printReport?.totalPrints || 0} />
            <StatCard title="Unique Documents" value={printReport?.uniqueDocuments || 0} />
            <StatCard title="Unique Personnel" value={printReport?.uniqueEmployees || 0} />
          </div>
          
          <Card>
            <CardHeader className="border-b bg-slate-50 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Print Volume (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 h-[300px]">
              {printReport?.byDay && printReport.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={printReport.byDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '2px', border: '1px solid #e2e8f0', fontSize: '12px', fontFamily: 'monospace' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center font-mono text-sm text-muted-foreground">NO DATA</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="border-b bg-slate-50 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">By Department</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Distributions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distReport?.byDepartment.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-xs uppercase tracking-wider">{item.name}</TableCell>
                        <TableCell className="text-right font-mono">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b bg-slate-50 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">By Category</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Distributions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distReport?.byCategory.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-bold text-xs uppercase tracking-wider">{item.name}</TableCell>
                        <TableCell className="text-right font-mono">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revisions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Revisions" value={revReport?.totalRevisions || 0} className="md:col-span-1" />
            {revReport?.byStatus.map(s => (
              <StatCard key={s.status} title={`Status: ${s.status.replace("_", " ")}`} value={s.count} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, className = "" }: any) {
  return (
    <Card className={`shadow-sm border-slate-200 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}