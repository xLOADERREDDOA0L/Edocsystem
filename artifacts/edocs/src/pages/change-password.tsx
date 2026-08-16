import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useChangePassword } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ChangePassword() {
  const { user, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const changePasswordMut = useChangePassword();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    changePasswordMut.mutate({
      data: { currentPassword, newPassword }
    }, {
      onSuccess: () => {
        toast.success("Password updated successfully");
        refetchUser(); // This should update mustChangePassword to false
        setLocation("/dashboard");
      },
      onError: (err: any) => {
        toast.error("Failed to update password", { description: err.message });
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-12">
      {user?.mustChangePassword && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-sm text-amber-800 text-sm font-medium flex gap-3 items-start">
          <div className="mt-0.5">⚠️</div>
          <div>Your account requires a password change before you can access the system. Please set a new secure password.</div>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your terminal access credentials</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input 
                id="currentPassword" 
                type="password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="font-mono"
              />
            </div>
            <Button type="submit" className="w-full" disabled={changePasswordMut.isPending}>
              {changePasswordMut.isPending ? "UPDATING..." : "UPDATE CREDENTIALS"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}