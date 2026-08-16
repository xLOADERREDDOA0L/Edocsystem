import { useGetDocument, useListRevisions, useApproveRevision, useRejectRevision, useSubmitRevision } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Plus, Download, Printer, Send, ArrowUpCircle, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function DocumentDetail() {
  const { id } = useParams();
  const docId = parseInt(id || "0", 10);
  const { user } = useAuth();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: doc, isLoading: isDocLoading } = useGetDocument(docId, { query: { enabled: !!docId } as any });
  // listRevisions(id, options) — id is the document id (path param), not a query object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: revisions, isLoading: isRevisionsLoading } = useListRevisions(docId, { query: { enabled: !!docId } as any });

  const canApprove = ["administrator", "document_controller", "supervisor"].includes(user?.role ?? "");
  const canFinalApprove = ["administrator", "manager"].includes(user?.role ?? "");
  const canUploadRevision = ["administrator", "document_controller", "engineer"].includes(user?.role ?? "");

  const approveMut = useApproveRevision();
  const rejectMut = useRejectRevision();
  const submitMut = useSubmitRevision();

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  const handleApprove = async (revId: number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (approveMut.mutateAsync as any)({ id: docId, revId, data: {} });
      toast.success("Revision approved");
    } catch (err: any) {
      toast.error("Failed to approve", { description: err.message });
    }
  };

  const handleReject = async (revId: number) => {
    try {
      const reason = window.prompt("Reason for rejection:");
      if (!reason) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (rejectMut.mutateAsync as any)({ id: docId, revId, data: { reason } });
      toast.success("Revision rejected");
    } catch (err: any) {
      toast.error("Failed to reject", { description: err.message });
    }
  };

  const handleSubmitRev = async (revId: number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (submitMut.mutateAsync as any)({ id: docId, revId });
      toast.success("Revision submitted for review");
    } catch (err: any) {
      toast.error("Failed to submit", { description: err.message });
    }
  };

  const handleDownload = async (filePath: string, filename: string, originalName?: string | null) => {
    // Keep the original file extension (e.g. .pdf) so Windows knows how to open it
    const extMatch = originalName?.match(/\.[A-Za-z0-9]+$/);
    if (extMatch && !filename.toLowerCase().endsWith(extMatch[0].toLowerCase())) {
      filename += extMatch[0];
    }
    if (downloadingKey) return;
    setDownloadingKey(filePath);
    try {
      const token = localStorage.getItem("edocs_token");
      // filePath is stored as /objects/<uuid>; strip the /objects/ prefix for the route param
      const objectPath = filePath.replace(/^\/objects\//, "");
      const response = await fetch(`/api/storage/objects/${objectPath}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        toast.error("Download failed", { description: `Server returned ${response.status}` });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      toast.error("Download failed", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setDownloadingKey(null);
    }
  };

  if (isDocLoading) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  if (!doc) return <div>Document not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground">
            <Link href="/documents"><ArrowLeft className="w-4 h-4 mr-1" /> BACK TO LIBRARY</Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-mono">{doc.documentNumber}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="text-xl mt-1">{doc.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/requests/new?documentId=${doc.id}`}><Send className="w-4 h-4 mr-2" /> REQUEST COPY</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/print?documentId=${doc.id}`}><Printer className="w-4 h-4 mr-2" /> PRINT MASTER</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 md:col-span-2 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Document Metadata</CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
              <div>
                <div className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Category</div>
                <div className="font-medium">{doc.categoryName || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Department</div>
                <div className="font-medium">{doc.departmentName || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Created By</div>
                <div className="font-medium">{doc.createdByName || "-"}</div>
              </div>
              <div>
                <div className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Created At</div>
                <div className="font-mono">{formatDate(doc.createdAt)}</div>
              </div>
              <div className="col-span-2 mt-2">
                <div className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest mb-1">Description</div>
                <p className="text-sm leading-relaxed border p-3 rounded bg-slate-50">{doc.description || "No description provided."}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-3 border-b border-slate-700 bg-slate-900 rounded-t-sm">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-200">Current Revision</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {doc.currentRevision ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-5xl font-bold font-mono tracking-tighter text-blue-400">{doc.currentRevision.revisionNumber}</div>
                  <div className="mt-2"><StatusBadge status={doc.currentRevision.status} /></div>
                </div>
                
                <div className="space-y-3 text-sm border-t border-slate-700 pt-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Effective:</span>
                    <span className="font-mono font-medium">{formatDate(doc.currentRevision.effectiveDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Approved:</span>
                    <span className="font-mono font-medium">{formatDate(doc.currentRevision.approvalDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Prints:</span>
                    <span className="font-mono font-bold text-emerald-400">{doc.printCount || 0}</span>
                  </div>
                </div>
                
                {doc.currentRevision.filePath && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 mt-4"
                    disabled={downloadingKey === doc.currentRevision.filePath}
                    onClick={() =>
                      handleDownload(
                        doc.currentRevision!.filePath!,
                        `${doc.documentNumber}-Rev${doc.currentRevision!.revisionNumber}`,
                        doc.currentRevision!.fileName
                      )
                    }
                  >
                    {downloadingKey === doc.currentRevision.filePath ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> DOWNLOADING…</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" /> DOWNLOAD FILE</>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 font-mono text-sm">
                NO ACTIVE REVISION
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Revision History</CardTitle>
          {canUploadRevision && (
            <Button size="sm" asChild>
              <Link href={`/revisions/new/${doc.id}`}><Plus className="w-3 h-3 mr-1" /> UPLOAD REVISION</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Rev</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isRevisionsLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ) : revisions?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-xs">NO REVISIONS FOUND</TableCell></TableRow>
              ) : (
                revisions?.map(rev => (
                  <TableRow key={rev.id}>
                    <TableCell className="font-mono font-bold">{rev.revisionNumber}</TableCell>
                    <TableCell><StatusBadge status={rev.status} /></TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">{rev.fileName || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{formatDate(rev.effectiveDate)}</TableCell>
                    <TableCell className="text-xs">{rev.uploadedByName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {rev.filePath && (rev.status === "approved" || canApprove || canFinalApprove || (rev as any).uploadedBy === user?.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Download"
                            className="h-7 w-7"
                            disabled={downloadingKey === rev.filePath}
                            onClick={() =>
                              handleDownload(
                                rev.filePath!,
                                `${doc.documentNumber}-Rev${rev.revisionNumber}`,
                                rev.fileName
                              )
                            }
                          >
                            {downloadingKey === rev.filePath ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                        {rev.status === 'draft' && canUploadRevision && (
                          <Button variant="outline" size="icon" title="Submit for Review" className="h-7 w-7 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => handleSubmitRev(rev.id)}>
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {rev.status === 'under_review' && canApprove && (
                          <>
                            <Button variant="outline" size="icon" title="Approve (send to manager)" className="h-7 w-7 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleApprove(rev.id)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" title="Reject" className="h-7 w-7 border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleReject(rev.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        {rev.status === 'manager_review' && canFinalApprove && (
                          <>
                            <Button variant="outline" size="icon" title="Final Approve" className="h-7 w-7 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleApprove(rev.id)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline" size="icon" title="Reject" className="h-7 w-7 border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleReject(rev.id)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
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