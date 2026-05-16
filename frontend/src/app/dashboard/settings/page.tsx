"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, CheckCircle, AlertCircle } from "lucide-react";

function Alert({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "", confirm: "" });
  const [pwStatus, setPwStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setPwStatus({ ok: false, msg: "Passwords do not match" });
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwStatus({ ok: false, msg: "Password must be at least 8 characters" });
      return;
    }
    setPwLoading(true);
    setPwStatus(null);
    try {
      await api.put("/auth/password", { old_password: pwForm.old_password, new_password: pwForm.new_password });
      setPwStatus({ ok: true, msg: "Password changed successfully" });
      setPwForm({ old_password: "", new_password: "", confirm: "" });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to change password";
      setPwStatus({ ok: false, msg });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account</p>
      </div>

      {/* Profile */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <User className="w-4 h-4 text-nebula-400" />
          <h2 className="text-sm font-medium text-white">Profile</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-nebula-600/30 border border-nebula-600/50 flex items-center justify-center text-xl font-bold text-nebula-400">
            {user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-white font-medium">{user?.username ?? "—"}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              user?.role === "admin" ? "bg-red-500/20 text-red-400" :
              user?.role === "operator" ? "bg-amber-500/20 text-amber-400" :
              "bg-blue-500/20 text-blue-400"
            }`}>
              {user?.role ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-4 h-4 text-nebula-400" />
          <h2 className="text-sm font-medium text-white">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old_password">Current Password</Label>
            <Input id="old_password" type="password" value={pwForm.old_password}
              onChange={(e) => setPwForm((f) => ({ ...f, old_password: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new_password">New Password</Label>
            <Input id="new_password" type="password" value={pwForm.new_password}
              onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input id="confirm" type="password" value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} required />
          </div>
          {pwStatus && <Alert ok={pwStatus.ok} msg={pwStatus.msg} />}
          <Button type="submit" disabled={pwLoading}>
            {pwLoading ? "Saving..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
