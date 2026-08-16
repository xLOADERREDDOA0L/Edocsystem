import { useState } from "react";
import { useCreateDocument, useListCategories, useListDepartments } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";

export default function NewDocument() {
  const [, setLocation] = useLocation();
  const createMut = useCreateDocument();
  
  const { data: categories } = useListCategories();
  const { data: departments } = useListDepartments();

  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!documentNumber || !title) {
      toast.error("Document Number and Title are required");
      return;
    }

    createMut.mutate({
      data: {
        documentNumber,
        title,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        departmentId: departmentId ? parseInt(departmentId) : undefined,
        description
      }
    }, {
      onSuccess: (res) => {
        toast.success(`Document ${res.documentNumber} registered`);
        setLocation(`/documents/${res.id}`);
      },
      onError: (err: any) => {
        toast.error("Registration failed", { description: err.message });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/documents"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Register Document</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Initialize new controlled document record</p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="bg-slate-50 border-b pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Document Metadata</CardTitle>
          <CardDescription>Enter the identifying properties for this document</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="documentNumber" className="text-xs font-bold uppercase">Document Number <span className="text-red-500">*</span></Label>
                <Input 
                  id="documentNumber" 
                  value={documentNumber} 
                  onChange={e => setDocumentNumber(e.target.value)} 
                  required
                  placeholder="e.g. ENG-SOP-001"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs font-bold uppercase">Document Title <span className="text-red-500">*</span></Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  placeholder="e.g. Standard Operating Procedure"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select classification..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold uppercase">Owning Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map(d => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase">Description / Scope</Label>
              <Textarea 
                id="description" 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the document's purpose and scope..."
                className="h-24"
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button type="button" variant="ghost" className="mr-2" asChild>
                <Link href="/documents">CANCEL</Link>
              </Button>
              <Button type="submit" disabled={createMut.isPending} className="font-bold">
                <Save className="w-4 h-4 mr-2" />
                {createMut.isPending ? "REGISTERING..." : "REGISTER DOCUMENT"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}