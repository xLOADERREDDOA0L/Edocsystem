import { useState, useEffect } from "react";
import { useCreateRequest, useListDocuments } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

export default function NewRequest() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialDocId = searchParams.get("documentId");

  const createMut = useCreateRequest();
  const { data: docs } = useListDocuments({ limit: 1000, status: "approved" });

  const [documentId, setDocumentId] = useState<string>(initialDocId || "");
  const [purpose, setPurpose] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId) {
      toast.error("Please select a document");
      return;
    }

    const doc = docs?.data.find(d => d.id.toString() === documentId);
    if (!doc || !doc.currentRevisionId) {
      toast.error("Selected document has no active revision");
      return;
    }

    createMut.mutate({
      data: {
        documentId: parseInt(documentId),
        revisionId: doc.currentRevisionId,
        purpose,
        numberOfCopies: 1
      }
    }, {
      onSuccess: () => {
        toast.success("Request submitted for approval");
        setLocation("/requests");
      },
      onError: (err: any) => {
        toast.error("Failed to submit request", { description: err.message });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/requests"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Request Document</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Submit access request for controlled document</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Request Details</CardTitle>
          <CardDescription>Fill out justification for access</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="document" className="text-xs font-bold uppercase">Target Document <span className="text-red-500">*</span></Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger id="document" className="font-mono">
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

            <div className="space-y-2">
              <Label htmlFor="purpose" className="text-xs font-bold uppercase">Justification / Purpose <span className="text-red-500">*</span></Label>
              <Textarea 
                id="purpose" 
                value={purpose} 
                onChange={e => setPurpose(e.target.value)}
                placeholder="Explain why you need access to this document..."
                className="h-32"
                required
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="ghost" className="mr-2" asChild>
                <Link href="/requests">CANCEL</Link>
              </Button>
              <Button type="submit" disabled={createMut.isPending} className="font-bold bg-indigo-600 hover:bg-indigo-700">
                <Send className="w-4 h-4 mr-2" />
                {createMut.isPending ? "SUBMITTING..." : "SUBMIT REQUEST"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}