import { useState } from "react";
import { useListRequests, useApproveRequest, useRejectRequest } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { Plus, Check, X, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RequestsList() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"mine" | "pending">("mine");
  
  const { data: myRequests, isLoading: myLoading, refetch: refetchMine } = useListRequests({ mine: true });
  const { data: pendingRequests, isLoading: pendingLoading, refetch: refetchPending } = useListRequests({ status: "pending" });

  const approveMut = useApproveRequest();
  const rejectMut = useRejectRequest();

  const handleApprove = async (id: number) => {
    try {
      await approveMut.mutateAsync({ id });
      toast.success("Request approved");
      refetchMine();
      refetchPending();
    } catch (err: any) {
      toast.error("Failed to approve", { description: err.message });
    }
  };

  const handleReject = async (id: number, reason: string) => {
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    try {
      await rejectMut.mutateAsync({ id, data: { reason } });
      toast.success("Request rejected");
      refetchMine();
      refetchPending();
    } catch (err: any) {
      toast.error("Failed to reject", { description: err.message });
    }
  };

  const canApprove = user?.role === 'administrator' || user?.role === 'document_controller' || user?.role === 'supervisor';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Requests</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Manage access and print requests</p>
        </div>
        <Button asChild>
          <Link href="/requests/new"><Plus className="w-4 h-4 mr-2" /> NEW REQUEST</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="p-0 border-b">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-[400px] grid-cols-2">
                <TabsTrigger value="mine" className="font-mono text-xs tracking-wider">MY REQUESTS</TabsTrigger>
                <TabsTrigger value="pending" className="font-mono text-xs tracking-wider">PENDING APPROVAL</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {tab === "mine" ? (
            <RequestTable 
              requests={myRequests?.data || []} 
              isLoading={myLoading} 
              showActions={false} 
            />
          ) : (
            <RequestTable 
              requests={pendingRequests?.data || []} 
              isLoading={pendingLoading} 
              showActions={canApprove}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestTable({ requests, isLoading, showActions, onApprove, onReject }: any) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Req No</TableHead>
          <TableHead>Document</TableHead>
          <TableHead className="w-[80px]">Rev</TableHead>
          <TableHead>Requested By</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead className="w-[120px]">Status</TableHead>
          <TableHead className="w-[150px]">Date</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
        ) : requests.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs">
              NO REQUESTS FOUND
            </TableCell>
          </TableRow>
        ) : (
          requests.map((req: any) => (
            <TableRow key={req.id}>
              <TableCell className="font-mono font-bold text-xs">{req.requestNumber}</TableCell>
              <TableCell className="font-medium">
                {req.documentNumber}
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{req.documentTitle}</div>
              </TableCell>
              <TableCell className="font-mono">{req.revisionNumber || "LATEST"}</TableCell>
              <TableCell className="text-xs">{req.requestedByName}</TableCell>
              <TableCell className="text-xs truncate max-w-[150px]">{req.purpose || "-"}</TableCell>
              <TableCell><StatusBadge status={req.status} /></TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(req.requestedAt)}</TableCell>
              
              {showActions && (
                <TableCell className="text-right">
                  {req.status === 'pending' && (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7 text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => onApprove(req.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <RejectDialog onReject={(reason) => onReject(req.id, reason)} />
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function RejectDialog({ onReject }: { onReject: (r: string) => void }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-7 w-7 text-red-600 border-red-200 hover:bg-red-50">
          <X className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Request</DialogTitle>
          <DialogDescription>Please provide a reason for rejecting this document request.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="reason" className="text-xs font-bold uppercase mb-2 block">Rejection Reason</Label>
          <Textarea 
            id="reason" 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            placeholder="e.g. Incomplete justification..."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>CANCEL</Button>
          <Button variant="destructive" onClick={() => { onReject(reason); setOpen(false); }}>REJECT</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}