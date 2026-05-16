"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-surface-border bg-surface-card flex-shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2 w-72">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Search..."
          className="bg-transparent text-sm text-white placeholder:text-muted-foreground outline-none w-full"
        />
        <kbd className="text-xs text-muted-foreground bg-surface-border px-1.5 py-0.5 rounded">⌘K</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-nebula-500 rounded-full" />
        </Button>

        <div className="flex items-center gap-2 pl-3 border-l border-surface-border">
          <div className="w-8 h-8 rounded-full bg-nebula-600 flex items-center justify-center text-sm font-bold">
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-white">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
