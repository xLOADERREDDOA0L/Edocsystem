import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionExpiryBannerProps {
  secondsLeft: number;
  onRefresh: () => void;
  onDismiss: () => void;
  isRefreshing: boolean;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export function SessionExpiryBanner({
  secondsLeft,
  onRefresh,
  onDismiss,
  isRefreshing,
}: SessionExpiryBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-4 bg-amber-950 border-b border-amber-800 px-4 py-2.5 text-amber-100 font-mono text-sm shadow-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-amber-200 font-medium">SESSION EXPIRING IN</span>
        <span className="text-amber-400 font-bold tabular-nums">{formatCountdown(secondsLeft)}</span>
        <span className="text-amber-300/70 hidden sm:inline">— unsaved work will be lost</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs font-mono border-amber-700 bg-amber-900/50 text-amber-200 hover:bg-amber-800 hover:text-amber-100 hover:border-amber-600"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1.5" />
          )}
          Stay signed in
        </Button>
        <button
          onClick={onDismiss}
          className="text-amber-400/60 hover:text-amber-300 transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
