"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ username: "", password: "", totp: "" });
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(form.username, form.password, totpRequired ? form.totp : undefined);
      if (result.totpRequired) {
        setTotpRequired(true);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 rounded-2xl bg-surface-card border border-surface-border shadow-2xl"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-nebula-600 mb-4">
            <span className="text-2xl">🌌</span>
          </div>
          <h1 className="text-2xl font-bold text-white">NebulaOS</h1>
          <p className="text-muted-foreground text-sm mt-1">Home Server Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!totpRequired ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="totp">2FA Code</Label>
              <Input
                id="totp"
                placeholder="000000"
                maxLength={6}
                value={form.totp}
                onChange={(e) => setForm((f) => ({ ...f, totp: e.target.value }))}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : totpRequired ? "Verify" : "Sign In"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
