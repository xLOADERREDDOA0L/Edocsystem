import { useState } from "react";
import { useListPrintTransactions } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { Printer, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PrintHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useListPrintTransactions({ page, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Print History</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Log of all physically distributed controlled copies</p>
      </div>

      <Card>
        <CardHeader className="border-b bg-slate-50 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Printer className="w-4 h-4" /> Transaction Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Transaction ID</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-[80px]">Rev</TableHead>
                <TableHead className="w-[100px]">Copy No.</TableHead>
                <TableHead>Printed By</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="text-right w-[80px]">QR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 font-mono text-xs">LOADING LEDGER...</TableCell></TableRow>
              ) : (data?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono text-xs">
                    NO PRINT TRANSACTIONS RECORDED
                  </TableCell>
                </TableRow>
              ) : (
                data?.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono font-bold text-xs">{tx.transactionNumber}</TableCell>
                    <TableCell className="font-medium">
                      {tx.documentNumber}
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.documentTitle}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-slate-700">{tx.revisionNumber}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Badge variant="outline" className="font-mono">{tx.copyNumber}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{tx.employeeName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider ${tx.status === 'valid' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(tx.printedAt)}</TableCell>
                    <TableCell className="text-right">
                      {tx.qrToken && (
                        <a href={`/verify/${tx.qrToken}`} target="_blank" rel="noreferrer" title="View Verification Page" className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
                          <QrCode className="w-3.5 h-3.5" />
                        </a>
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