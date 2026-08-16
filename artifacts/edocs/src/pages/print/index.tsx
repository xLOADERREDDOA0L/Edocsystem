import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  usePrintDocument,
  useListDocuments,
  useListPrintTransactions,
  getListPrintTransactionsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Printer, AlertTriangle, CheckCircle, RotateCcw, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "react-qr-code";

const DUPLICATE_WINDOW_DAYS = 7;

interface PrintTransaction {
  id: number;
  transactionNumber: string;
  documentNumber: string;
  documentTitle: string;
  revisionNumber: string;
  employeeName: string;
  copyNumber: string;
  numberOfCopies: number;
  qrToken: string;
  printedAt: string;
}

function PrintConfirmation({
  tx,
  onReset,
}: {
  tx: PrintTransaction;
  onReset: () => void;
}) {
  const verifyUrl = `${window.location.origin}/verify/${tx.qrToken}`;
  const printedDate = new Date(tx.printedAt).toLocaleString();

  return (
    <div className="max-w-2xl mx-auto space-y-6 print:max-w-none print:space-y-4">
      {/* Screen-only header */}
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Print Confirmation</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">
          Controlled copy successfully registered
        </p>
      </div>

      {/* Success banner – screen only */}
      <div className="bg-green-50 border border-green-200 rounded p-4 flex gap-3 text-green-800 text-sm print:hidden">
        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-green-600" />
        <div>
          <strong className="block font-bold mb-1">PRINT JOB REGISTERED</strong>
          Your controlled copy has been logged. Scan the QR code below to verify authenticity at any time.
        </div>
      </div>

      {/* Printable slip */}
      <Card className="shadow-sm border-slate-200 border-t-4 border-t-slate-800 print:shadow-none print:border print:border-slate-400">
        {/* Print-only header */}
        <div className="hidden print:block px-6 pt-6 pb-2 border-b border-slate-200">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Controlled Document Copy — Verification Slip</p>
        </div>

        <CardHeader className="bg-slate-50 border-b pb-4 print:bg-white">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Document Details</CardTitle>
          <CardDescription className="print:hidden">Transaction {tx.transactionNumber}</CardDescription>
          <p className="hidden print:block text-xs font-mono text-slate-500">TX: {tx.transactionNumber}</p>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-8 print:flex-row">
            {/* Info grid */}
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Document No.</p>
                <p className="font-mono font-semibold">{tx.documentNumber}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Revision</p>
                <p className="font-mono font-semibold">{tx.revisionNumber}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Title</p>
                <p className="font-semibold">{tx.documentTitle}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Copy No.</p>
                <p className="font-mono font-semibold">{tx.copyNumber}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Copies Issued</p>
                <p className="font-mono font-semibold">{tx.numberOfCopies}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Issued To</p>
                <p className="font-semibold">{tx.employeeName}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Printed At</p>
                <p className="font-mono text-xs">{printedDate}</p>
              </div>
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="border-2 border-slate-800 p-3 rounded bg-white">
                <QRCode
                  value={verifyUrl}
                  size={148}
                  bgColor="#ffffff"
                  fgColor="#1e293b"
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-slate-500">Scan to Verify</p>
                <p className="text-xs font-mono text-slate-400 mt-0.5 break-all max-w-[160px]">
                  {tx.qrToken.slice(0, 8)}…
                </p>
              </div>
            </div>
          </div>

          {/* Token info – visible only on screen as small text */}
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 print:border-slate-300">
            <p className="text-xs font-mono text-slate-400 break-all">
              <span className="font-bold text-slate-500">Verify URL: </span>
              {verifyUrl}
            </p>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50 border-t p-6 flex justify-between items-center print:hidden">
          <Button variant="outline" onClick={() => window.print()} className="font-bold">
            <Printer className="w-4 h-4 mr-2" />
            Print Slip
          </Button>
          <Button onClick={onReset} className="font-bold px-8">
            <RotateCcw className="w-4 h-4 mr-2" />
            New Print Job
          </Button>
        </CardFooter>
      </Card>

      {/* Print-only footer */}
      <div className="hidden print:block text-center text-xs font-mono text-slate-400 mt-4">
        This slip is system-generated. Do not duplicate. Unauthorized copies violate document control policy.
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}

export default function PrintControl() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialDocId = searchParams.get("documentId");

  const { user } = useAuth();
  const canPrint = ["administrator", "document_controller"].includes(user?.role ?? "");
  const queryClient = useQueryClient();
  const printMut = usePrintDocument();
  const { data: docs } = useListDocuments({ limit: 1000, status: "approved" });

  const [documentId, setDocumentId] = useState<string>(initialDocId || "");
  const [numberOfCopies, setNumberOfCopies] = useState<number>(1);
  const [purpose, setPurpose] = useState("");
  const [confirmedTx, setConfirmedTx] = useState<PrintTransaction | null>(null);
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(false);

  const selectedDoc = docs?.data.find(d => d.id.toString() === documentId);

  // Stable "from" date for the duplicate window — memoized so the query key
  // doesn't change on every render and trigger an infinite refetch loop.
  const fromDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - DUPLICATE_WINDOW_DAYS);
    return d.toISOString();
  }, []);

  // Query recent print transactions for this document + current user
  const duplicateQueryEnabled = !!documentId && !!user?.id;
  const duplicateQueryParams = useMemo(
    () => ({
      documentId: documentId ? parseInt(documentId) : undefined,
      userId: user?.id,
      fromDate,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId, user?.id, fromDate]
  );
  const {
    data: recentTxs,
    isLoading: isDuplicateLoading,
    isFetching: isDuplicateFetching,
    isError: isDuplicateError,
  } = useListPrintTransactions(
    duplicateQueryParams,
    { query: { enabled: duplicateQueryEnabled } as any }
  );

  // Block while loading OR while a background refetch is in progress
  const isDuplicatePending = duplicateQueryEnabled && (isDuplicateLoading || isDuplicateFetching);
  // Only treat check as resolved when the query completed successfully (not loading/fetching/errored)
  const duplicateCheckReady = !duplicateQueryEnabled || (!isDuplicatePending && !isDuplicateError);
  const recentPrints = duplicateCheckReady ? (recentTxs ?? []) : [];
  const hasDuplicate = duplicateCheckReady && recentPrints.length > 0;
  const mostRecentPrint = hasDuplicate ? recentPrints[0] : null;

  // Reset acknowledgment whenever the selected document changes
  const handleDocumentChange = (val: string) => {
    setDocumentId(val);
    setDuplicateAcknowledged(false);
  };

  const handlePrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) {
      toast.error("Please select a document");
      return;
    }
    if (!selectedDoc?.currentRevisionId) {
      toast.error("Selected document has no active revision");
      return;
    }
    if (isDuplicatePending) {
      toast.warning("Checking for duplicate prints — please wait a moment");
      return;
    }
    if (duplicateQueryEnabled && isDuplicateError) {
      toast.error("Could not verify duplicate prints. Please try again.");
      return;
    }
    if (hasDuplicate && !duplicateAcknowledged) {
      toast.warning("Please acknowledge the duplicate-print warning before continuing");
      return;
    }

    printMut.mutate({
      data: {
        documentId: parseInt(documentId),
        revisionId: selectedDoc.currentRevisionId,
        numberOfCopies,
        purpose
      }
    }, {
      onSuccess: (data: any) => {
        // Invalidate the duplicate-check cache so re-selecting this document
        // after reset shows the freshly issued copy as a duplicate.
        queryClient.invalidateQueries({
          queryKey: getListPrintTransactionsQueryKey(duplicateQueryParams),
        });
        setConfirmedTx(data as PrintTransaction);
        toast.success(`Successfully registered ${numberOfCopies} controlled copies.`);
      },
      onError: (err: any) => {
        toast.error("Print registration failed", { description: err.message });
      }
    });
  };

  const handleReset = () => {
    setConfirmedTx(null);
    setDocumentId("");
    setNumberOfCopies(1);
    setPurpose("");
    setDuplicateAcknowledged(false);
    printMut.reset();
  };

  if (confirmedTx) {
    return <PrintConfirmation tx={confirmedTx} onReset={handleReset} />;
  }

  if (!canPrint) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded p-6 flex gap-3 text-red-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold uppercase tracking-wider">Access Restricted</p>
            <p className="mt-1">Only the Document Controller (or an administrator) can print controlled copies. Please send a print request instead.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Print Control Room</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Generate controlled, watermarked copies</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded p-4 flex gap-3 text-amber-800 text-sm">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <strong className="block font-bold mb-1">STRICT PROTOCOL</strong>
          Printed copies are strictly tracked. Do not duplicate printed copies using a copier. Every physical copy must have a unique system-generated QR watermark. Return obsolete copies for destruction.
        </div>
      </div>

      {/* Duplicate print warning */}
      {hasDuplicate && mostRecentPrint && (
        <div className="bg-red-50 border border-red-300 rounded p-4 flex gap-3 text-red-800 text-sm">
          <Clock className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 space-y-3">
            <div>
              <strong className="block font-bold mb-1 uppercase tracking-wide">Duplicate Print Detected</strong>
              <p>
                You already printed this document within the last {DUPLICATE_WINDOW_DAYS} days.
                Issuing another copy may violate controlled-copy limits.
              </p>
            </div>
            <div className="bg-red-100 border border-red-200 rounded p-3 font-mono text-xs space-y-1">
              <div className="flex gap-4">
                <span className="text-red-500 font-bold uppercase">Copy No.</span>
                <span className="font-semibold">{mostRecentPrint.copyNumber}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-red-500 font-bold uppercase">Printed At</span>
                <span>{new Date(mostRecentPrint.printedAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-red-500 font-bold uppercase">Transaction</span>
                <span>{mostRecentPrint.transactionNumber}</span>
              </div>
              {recentPrints.length > 1 && (
                <div className="flex gap-4">
                  <span className="text-red-500 font-bold uppercase">Total Recent</span>
                  <span>{recentPrints.length} prints in last {DUPLICATE_WINDOW_DAYS} days</span>
                </div>
              )}
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox
                id="duplicate-ack"
                checked={duplicateAcknowledged}
                onCheckedChange={v => setDuplicateAcknowledged(!!v)}
                className="mt-0.5 border-red-400 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <span className="text-xs font-semibold leading-snug">
                I acknowledge this is a duplicate and confirm I need an additional controlled copy.
              </span>
            </label>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-slate-200 border-t-4 border-t-slate-800">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Print Configuration</CardTitle>
          <CardDescription>Setup parameters for physical distribution</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handlePrint} id="print-form" className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="document" className="text-xs font-bold uppercase">Target Document <span className="text-red-500">*</span></Label>
              <Select value={documentId} onValueChange={handleDocumentChange}>
                <SelectTrigger id="document" className="font-mono h-12">
                  <SelectValue placeholder="Select approved document..." />
                </SelectTrigger>
                <SelectContent>
                  {docs?.data.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      {d.documentNumber} - {d.title} (Rev: {d.currentRevisionNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="copies" className="text-xs font-bold uppercase">Number of Copies <span className="text-red-500">*</span></Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="50"
                  value={numberOfCopies}
                  onChange={e => setNumberOfCopies(parseInt(e.target.value) || 1)}
                  className="font-mono h-12 text-lg text-center"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose" className="text-xs font-bold uppercase">Purpose (Optional)</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Line 2 Assembly"
                  className="h-12"
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t p-6 flex justify-between items-center">
          <div className="text-xs text-muted-foreground font-mono">
            {selectedDoc ? `Ready to print Rev ${selectedDoc.currentRevisionNumber}` : "Awaiting document selection"}
          </div>
          <Button
            type="submit"
            form="print-form"
            disabled={
              printMut.isPending ||
              !documentId ||
              isDuplicatePending ||
              (duplicateQueryEnabled && isDuplicateError) ||
              (hasDuplicate && !duplicateAcknowledged)
            }
            className="font-bold px-8 h-12"
            size="lg"
          >
            <Printer className="w-5 h-5 mr-2" />
            {printMut.isPending
              ? "GENERATING..."
              : isDuplicatePending
                ? "CHECKING..."
                : "EXECUTE PRINT JOB"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
