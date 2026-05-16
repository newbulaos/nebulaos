"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Puzzle, Search, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  icon: string;
  enabled: boolean;
  installed: boolean;
}

const PLUGINS: Plugin[] = [
  { id: "fail2ban", name: "Fail2Ban", description: "Automatically ban IPs with too many failed login attempts", author: "NebulaOS", version: "1.0.0", category: "Security", icon: "🛡️", enabled: false, installed: false },
  { id: "caddy-proxy", name: "Caddy Proxy", description: "Automatic HTTPS reverse proxy with Let's Encrypt", author: "NebulaOS", version: "1.0.0", category: "Networking", icon: "🔀", enabled: false, installed: false },
  { id: "backup", name: "Backup Manager", description: "Scheduled backups to S3, Backblaze, or local storage", author: "NebulaOS", version: "0.9.0", category: "Storage", icon: "💾", enabled: false, installed: false },
  { id: "notifications", name: "Notifications", description: "Send alerts via Telegram, Discord, or email", author: "NebulaOS", version: "1.0.0", category: "Utilities", icon: "🔔", enabled: false, installed: false },
  { id: "wireguard", name: "WireGuard VPN", description: "Manage WireGuard VPN peers and configs", author: "NebulaOS", version: "0.8.0", category: "Networking", icon: "🔒", enabled: false, installed: false },
  { id: "ddns", name: "Dynamic DNS", description: "Auto-update DNS records for Cloudflare, DuckDNS, etc.", author: "NebulaOS", version: "1.0.0", category: "Networking", icon: "🌐", enabled: false, installed: false },
];

const CATEGORIES = ["All", ...Array.from(new Set(PLUGINS.map((p) => p.category)))];

export default function PluginsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [plugins, setPlugins] = useState(PLUGINS);

  const toggle = (id: string) => {
    setPlugins((prev) => prev.map((p) => p.id === id ? { ...p, enabled: !p.enabled, installed: true } : p));
  };

  const filtered = plugins.filter((p) => {
    const matchCat = category === "All" || p.category === category;
    const q = search.toLowerCase();
    return matchCat && (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plugins</h1>
          <p className="text-muted-foreground text-sm">Extend NebulaOS with community plugins</p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400">
          <Puzzle className="w-3.5 h-3.5" /> Plugin SDK — v2.0
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search plugins..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                category === c ? "bg-nebula-600 text-white" : "bg-surface-card border border-surface-border text-muted-foreground hover:text-white")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin list */}
      <div className="space-y-3">
        {filtered.map((plugin) => (
          <motion.div key={plugin.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center gap-4 hover:border-nebula-600/40 transition-colors">
            <span className="text-2xl flex-shrink-0">{plugin.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{plugin.name}</p>
                <span className="text-xs text-muted-foreground">v{plugin.version}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-muted-foreground">{plugin.category}</span>
                {plugin.enabled && <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">Active</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{plugin.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">by {plugin.author}</p>
            </div>
            <button onClick={() => toggle(plugin.id)} className="flex-shrink-0 transition-colors">
              {plugin.enabled
                ? <ToggleRight className="w-8 h-8 text-nebula-400" />
                : <ToggleLeft className="w-8 h-8 text-muted-foreground hover:text-white" />}
            </button>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Puzzle className="w-8 h-8 mb-3 opacity-30" />
            <p>No plugins found</p>
          </div>
        )}
      </div>

      {/* SDK CTA */}
      <div className="bg-nebula-600/10 border border-nebula-600/30 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Build your own plugin</p>
          <p className="text-xs text-muted-foreground mt-0.5">Use the NebulaOS Plugin SDK to extend functionality</p>
        </div>
        <a href="https://github.com/nebulaos/nebulaos/tree/main/plugins/sdk" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-nebula-400 hover:text-nebula-300 transition-colors">
          View SDK <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
