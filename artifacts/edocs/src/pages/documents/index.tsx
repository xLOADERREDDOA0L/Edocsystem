import { useEffect, useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "@/lib/format";
import { Plus, Search, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentsList() {
  const searchString = useSearch();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const VALID_STATUSES = ["draft", "submitted", "under_review", "manager_review", "approved", "obsolete", "rejected"];
  // Keep the status filter in sync with the ?status= query param (deep links from dashboard)
  useEffect(() => {
    const urlStatus = new URLSearchParams(searchString).get("status");
    const next = urlStatus && VALID_STATUSES.includes(urlStatus) ? urlStatus : "all";
    setStatus(next);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);
  
  const { data, isLoading } = useListDocuments({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    page,
    limit: 20
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Document Library</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Browse and search engineering documents</p>
        </div>
        <Button asChild>
          <Link href="/documents/new"><Plus className="w-4 h-4 mr-2" /> NEW DOCUMENT</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by document number, title..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 font-mono"
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ALL STATUSES</SelectItem>
                  <SelectItem value="draft">DRAFT</SelectItem>
                  <SelectItem value="submitted">SUBMITTED</SelectItem>
                  <SelectItem value="under_review">UNDER REVIEW</SelectItem>
                  <SelectItem value="manager_review">MANAGER REVIEW</SelectItem>
                  <SelectItem value="approved">APPROVED</SelectItem>
                  <SelectItem value="obsolete">OBSOLETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Doc No</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[100px]">Rev</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[150px]">Category</TableHead>
                <TableHead className="w-[150px]">Department</TableHead>
                <TableHead className="w-[150px]">Updated</TableHead>
                <TableHead className="text-right w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    <p className="font-mono text-sm">NO DOCUMENTS FOUND</p>
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono font-medium">{doc.documentNumber}</TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell className="font-mono">{doc.currentRevisionNumber || "-"}</TableCell>
                    <TableCell><StatusBadge status={doc.status} /></TableCell>
                    <TableCell className="text-xs uppercase truncate max-w-[150px]">{doc.categoryName || "-"}</TableCell>
                    <TableCell className="text-xs uppercase truncate max-w-[150px]">{doc.departmentName || "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{formatDate(doc.updatedAt || doc.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild className="font-mono text-[10px] h-7">
                        <Link href={`/documents/${doc.id}`}>VIEW</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="text-xs font-mono text-muted-foreground">
                SHOWING {((page - 1) * data.limit) + 1} TO {Math.min(page * data.limit, data.total)} OF {data.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>PREV</Button>
                <Button variant="outline" size="sm" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>NEXT</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}