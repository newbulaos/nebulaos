"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, Plus, Trash2, QrCode, CheckCircle, AlertCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface User { id: string; username: string; email: string; role: string; is_active: boolean; last_login_at: string }

function Alert({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

export default function SecurityPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const isAdmin = me?.role === "admin";

  // TOTP
  const [totpData, setTotpData] = useState<{ secret: string; url: string } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpStatus, setTotpStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const setupTotp = async () => {
    const { data } = await api.post("/auth/totp/setup");
    setTotpData(data);
    setTotpStatus(null);
  };

  const verifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/totp/verify", { code: totpCode });
      setTotpStatus({ ok: true, msg: "2FA enabled successfully" });
      setTotpData(null);
      setTotpCode("");
    } catch {
      setTotpStatus({ ok: false, msg: "Invalid code, try again" });
    }
  };

  // Users (admin only)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((r) => r.data),
    enabled: isAdmin,
  });

  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "viewer" });
  const [createStatus, setCreateStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () => api.post("/users", newUser),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setNewUser({ username: "", email: "", password: "", role: "viewer" });
      setCreateStatus({ ok: true, msg: "User created" });
    },
    onError: () => setCreateStatus({ ok: false, msg: "Failed to create user" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-muted-foreground text-sm">Two-factor authentication and user management</p>
      </div>

      {/* TOTP */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <QrCode className="w-4 h-4 text-nebula-400" />
          <h2 className="text-sm font-medium text-white">Two-Factor Authentication (TOTP)</h2>
        </div>
        {!totpData ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Add an extra layer of security using an authenticator app (Google Authenticator, Authy, etc.)</p>
            {totpStatus && <Alert ok={totpStatus.ok} msg={totpStatus.msg} />}
            <Button variant="ghost" className="border border-surface-border" onClick={setupTotp}>
              <Shield className="w-4 h-4 mr-2" /> Setup 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="flex gap-6 items-start">
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={totpData.url} size={140} />
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">Or enter manually:</p>
                <code className="text-xs bg-surface-hover px-2 py-1 rounded font-mono text-nebula-400 break-all">{totpData.secret}</code>
              </div>
            </div>
            <form onSubmit={verifyTotp} className="flex gap-2 items-end">
              <div className="space-y-2 flex-1">
                <Label htmlFor="totp_code">Verification Code</Label>
                <Input id="totp_code" placeholder="000000" maxLength={6} value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)} autoFocus />
              </div>
              <Button type="submit">Verify & Enable</Button>
            </form>
            {totpStatus && <Alert ok={totpStatus.ok} msg={totpStatus.msg} />}
          </div>
        )}
      </div>

      {/* User Management (admin only) */}
      {isAdmin && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-nebula-400" />
            <h2 className="text-sm font-medium text-white">User Management</h2>
          </div>

          {/* User list */}
          <div className="divide-y divide-surface-border rounded-lg border border-surface-border overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    u.role === "admin" ? "bg-red-500/20 text-red-400" :
                    u.role === "operator" ? "bg-amber-500/20 text-amber-400" :
                    "bg-blue-500/20 text-blue-400"
                  }`}>{u.role}</span>
                  {u.username !== me?.username && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => deleteMutation.mutate(u.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {users.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">No users</p>}
          </div>

          {/* Create user */}
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3 pt-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add User</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nu">Username</Label>
                <Input id="nu" value={newUser.username} onChange={(e) => setNewUser((f) => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne">Email</Label>
                <Input id="ne" type="email" value={newUser.email} onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np">Password</Label>
                <Input id="np" type="password" value={newUser.password} onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nr">Role</Label>
                <select id="nr" value={newUser.role} onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md bg-surface-hover border border-surface-border text-white text-sm">
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {createStatus && <Alert ok={createStatus.ok} msg={createStatus.msg} />}
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
