"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Container, AppWindow, FolderOpen,
  Activity, Shield, Settings, ChevronLeft, Puzzle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/docker", label: "Docker", icon: Container },
  { href: "/dashboard/apps", label: "App Store", icon: AppWindow },
  { href: "/dashboard/files", label: "Files", icon: FolderOpen },
  { href: "/dashboard/monitoring", label: "Monitoring", icon: Activity },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/plugins", label: "Plugins", icon: Puzzle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-surface-border">
        <span className="text-xl mr-2">🌌</span>
        <span className="font-bold text-white text-lg">NebulaOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-nebula-600/20 text-nebula-400 border border-nebula-600/30"
                    : "text-muted-foreground hover:text-white hover:bg-surface-hover"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-surface-border">
        <p className="text-xs text-muted-foreground">NebulaOS v1.0.0</p>
      </div>
    </aside>
  );
}
