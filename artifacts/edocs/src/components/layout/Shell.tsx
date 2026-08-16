import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LayoutDashboard, FileText, FileCheck, FileArchive, FileSearch, 
  Printer, History, QrCode, BarChart, History as HistoryIcon,
  Users, Building, Tags, LogOut, User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return <>{children}</>;

  const isNavActive = (path: string) => location === path || location.startsWith(path + "/");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-64 flex-col border-r bg-sidebar text-sidebar-foreground hidden md:flex shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold font-mono">ED</span>
            </div>
            eDocs Control
          </h1>
          <p className="text-[10px] text-sidebar-foreground/70 mt-1.5 font-mono uppercase tracking-widest">Industrial Standard</p>
        </div>
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="space-y-8 px-4">
            <div className="space-y-1">
              <Link href="/dashboard" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/dashboard") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Link>
            </div>
            
            <div className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 font-mono">Documents</h4>
              <Link href="/documents" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/documents") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                <FileText className="w-4 h-4" /> Library
              </Link>
              <Link href="/requests" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/requests") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                <FileSearch className="w-4 h-4" /> Requests
              </Link>
            </div>

            <div className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 font-mono">Distribution</h4>
              {(user.role === "administrator" || user.role === "document_controller") && (
                <Link href="/print" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${location === "/print" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                  <Printer className="w-4 h-4" /> Print Control
                </Link>
              )}
              <Link href="/print-history" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/print-history") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                <History className="w-4 h-4" /> Print History
              </Link>
            </div>

            <div className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 font-mono">Verification</h4>
              <Link href="/verify/scan" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/verify") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                <QrCode className="w-4 h-4" /> QR Verify
              </Link>
            </div>

            {(user.role === "administrator" || user.role === "document_controller" || user.role === "supervisor" || user.role === "manager") && (
              <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 font-mono">Insights</h4>
                <Link href="/reports" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/reports") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                  <BarChart className="w-4 h-4" /> Reports
                </Link>
                {(user.role === "administrator" || user.role === "document_controller") && (
                  <Link href="/audit" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/audit") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                    <HistoryIcon className="w-4 h-4" /> Audit Trail
                  </Link>
                )}
              </div>
            )}

            {user.role === "administrator" && (
              <div className="space-y-1">
                <h4 className="px-3 text-[10px] font-bold text-sidebar-foreground/50 uppercase tracking-widest mb-2 font-mono">Administration</h4>
                <Link href="/admin/users" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/admin/users") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                  <Users className="w-4 h-4" /> Users
                </Link>
                <Link href="/admin/departments" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/admin/departments") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                  <Building className="w-4 h-4" /> Departments
                </Link>
                <Link href="/admin/categories" className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors ${isNavActive("/admin/categories") ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white"}`}>
                  <Tags className="w-4 h-4" /> Categories
                </Link>
              </div>
            )}
          </nav>
        </div>
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {user.fullName?.charAt(0) || "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate uppercase tracking-widest font-mono mt-0.5">{user.role.replace("_", " ")}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-white text-xs" asChild>
              <Link href="/settings"><UserIcon className="w-3.5 h-3.5 mr-1.5" /> Profile</Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-1 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-white text-xs" onClick={() => logout()}>
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Logout
            </Button>
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-sidebar text-white">
          <div className="font-bold tracking-tight">eDocs Control</div>
          <Button variant="ghost" size="icon" onClick={() => logout()} className="text-white hover:bg-sidebar-accent">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}