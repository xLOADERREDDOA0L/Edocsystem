import { useState } from "react";
import { useListCategories, useCreateCategory } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_ROLES = ["administrator", "document_controller"];

export default function CategoriesList() {
  const { user } = useAuth();
  const { data, isLoading, refetch } = useListCategories();

  if (!ALLOWED_ROLES.includes(user?.role ?? "")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center space-y-4">
        <ShieldOff className="w-12 h-12 text-muted-foreground" />
        <div className="text-2xl font-mono font-bold text-muted-foreground">ACCESS RESTRICTED</div>
        <p className="text-muted-foreground max-w-md text-sm">
          Category Management is only accessible to Administrators and Document Controllers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Categories</h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-wider">Document classification taxonomy</p>
        </div>
        <NewCategoryDialog onCreated={() => refetch()} />
      </div>

      <Card>
        <CardHeader className="border-b bg-slate-50 pb-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wider">Registered Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 font-mono text-xs">LOADING...</TableCell></TableRow>
              ) : data?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-mono text-xs">NO CATEGORIES FOUND</TableCell></TableRow>
              ) : (
                data?.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="font-bold text-slate-900 uppercase tracking-wider text-xs">{c.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{c.description || "-"}</TableCell>
                    <TableCell className="font-mono text-[10px] uppercase tracking-wider text-emerald-600 font-bold">{c.status}</TableCell>
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

function NewCategoryDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createMut = useCreateCategory();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await createMut.mutateAsync({ data: { name, description } });
      toast.success("Category created");
      setOpen(false);
      setName("");
      setDescription("");
      onCreated();
    } catch (err: any) {
      toast.error("Failed to create", { description: err.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="w-4 h-4 mr-2" /> NEW CATEGORY</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>Register a new document classification</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase">Category Name</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Standard Operating Procedure" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-xs font-bold uppercase">Description</Label>
              <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>CANCEL</Button>
            <Button type="submit" disabled={createMut.isPending}>SAVE</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}