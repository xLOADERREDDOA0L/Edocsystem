import { useState, useRef } from "react";
import { useCreateRevision, useGetDocument, useRequestUploadUrl } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, UploadCloud, FileUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function NewRevision() {
  const { documentId } = useParams();
  const docId = parseInt(documentId || "0", 10);
  const [, setLocation] = useLocation();
  
  const { data: doc } = useGetDocument(docId, { query: { enabled: !!docId } });
  
  const createRevMut = useCreateRevision();
  const uploadUrlMut = useRequestUploadUrl();

  const [revisionNumber, setRevisionNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNumber || !file) {
      toast.error("Revision number and file are required");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // 1. Get presigned URL
      const urlRes = await uploadUrlMut.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream"
        }
      });
      
      setUploadProgress(30);

      // 2. Upload file directly
      const uploadRes = await fetch(urlRes.uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        }
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }
      
      setUploadProgress(80);

      // 3. Create revision record
      await createRevMut.mutateAsync({
        id: docId,
        data: {
          revisionNumber,
          filePath: urlRes.objectPath,
          fileName: file.name,
          effectiveDate: effectiveDate || undefined,
          description
        }
      });
      
      setUploadProgress(100);
      toast.success("Revision uploaded successfully");
      setLocation(`/documents/${docId}`);
      
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (!doc) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/documents/${docId}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Upload Revision</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono tracking-wider uppercase">
            Document: <span className="font-bold text-primary">{doc.documentNumber}</span>
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Revision Details</CardTitle>
          <CardDescription>Initialize a new draft revision for review</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="revisionNumber" className="text-xs font-bold uppercase">Revision Number <span className="text-red-500">*</span></Label>
                <Input 
                  id="revisionNumber" 
                  value={revisionNumber} 
                  onChange={e => setRevisionNumber(e.target.value)} 
                  required
                  placeholder="e.g. 01, A, 1.0"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveDate" className="text-xs font-bold uppercase">Target Effective Date</Label>
                <Input 
                  id="effectiveDate" 
                  type="date"
                  value={effectiveDate} 
                  onChange={e => setEffectiveDate(e.target.value)} 
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-xs font-bold uppercase">Document File <span className="text-red-500">*</span></Label>
              <div className="border-2 border-dashed border-slate-300 rounded-sm p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                <FileUp className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                {file ? (
                  <div>
                    <p className="font-bold text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-slate-700">Click to select file</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, DWG, XLSX allowed</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase">Change Summary</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what changed in this revision..."
                className="h-24"
              />
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-slate-500">
                  <span>UPLOADING TO STORAGE...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="ghost" className="mr-2" asChild disabled={isUploading}>
                <Link href={`/documents/${docId}`}>CANCEL</Link>
              </Button>
              <Button type="submit" disabled={isUploading || !file || !revisionNumber} className="font-bold">
                <UploadCloud className="w-4 h-4 mr-2" />
                {isUploading ? "PROCESSING..." : "UPLOAD REVISION"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}