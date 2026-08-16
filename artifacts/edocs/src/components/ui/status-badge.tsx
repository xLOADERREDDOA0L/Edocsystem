import { Badge } from "./badge";

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  
  let color = "bg-slate-100 text-slate-800 border-slate-200";
  if (s === "draft") color = "bg-slate-100 text-slate-800 border-slate-200";
  if (s === "submitted") color = "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "under_review") color = "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "manager_review") color = "bg-purple-100 text-purple-800 border-purple-200";
  if (s === "approved") color = "bg-green-100 text-green-800 border-green-200";
  if (s === "rejected") color = "bg-red-100 text-red-800 border-red-200";
  if (s === "obsolete") color = "bg-orange-100 text-orange-800 border-orange-200";
  if (s === "available") color = "bg-emerald-100 text-emerald-800 border-emerald-200";

  return (
    <Badge className={`font-mono text-[10px] uppercase tracking-wider ${color}`} variant="outline">
      {status.replace("_", " ")}
    </Badge>
  );
}