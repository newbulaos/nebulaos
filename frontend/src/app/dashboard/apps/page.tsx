"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Search, Download, RefreshCw, AlertCircle, ExternalLink, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Store { id: string; name: string; url: string }
interface App {
  id: string; name: string; description: string; tagline: string;
  icon: string; thumbnail: string; category: string; author: string;
  developer: string; port_map: string; store_id: string; screenshots: string[];
}

export default function AppsPage() {
  const [storeID, setStoreID] = useState("casaos-official");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => api.get("/stores").then((r) => r.data),
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery<{ apps: App[] }>({
    queryKey: ["apps", storeID],
    queryFn: () => api.get(`/apps?store=${storeID}`).then((r) => r.data),
    staleTime: 30 * 60 * 1000,
  });

  const apps = data?.apps ?? [];
  const categories = ["All", ...Array.from(new Set(apps.map((a) => a.category).filter(Boolean)))].sort();

  const filtered = apps.filter((a) => {
    const matchCat = category === "All" || a.category === category;
    const q = search.toLowerCase();
    return matchCat && (!q || a.name.toLowerCase().includes(q) || a.tagline?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q));
  });

  const handleInstall = async (id: string) => {
    setInstalling(id);
    await new Promise((r) => setTimeout(r, 1200));
    setInstalled((p) => new Set([...p, id]));
    setInstalling(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">App Store</h1>
          <p className="text-muted-foreground text-sm">
            {apps.length > 0 ? `${apps.length} apps available` : "CasaOS-compatible app stores"}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="border border-surface-border text-muted-foreground"
          onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("w-4 h-4 mr-1.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Store selector */}
      <div className="flex gap-2 flex-wrap">
        {stores.map((s) => (
          <button key={s.id} onClick={() => { setStoreID(s.id); setCategory("All"); }}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              storeID === s.id ? "bg-nebula-600 text-white" : "bg-surface-card border border-surface-border text-muted-foreground hover:text-white")}>
            {s.name}
          </button>
        ))}
      </div>

      {/* Search + category */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search apps..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                category === c ? "bg-nebula-600/80 text-white" : "bg-surface-card border border-surface-border text-muted-foreground hover:text-white")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <p className="text-sm">Fetching apps from store... (first load may take a moment)</p>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load store. The store URL may be unreachable.
          <button onClick={() => refetch()} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* App grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((app) => (
              <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-3 hover:border-nebula-600/50 transition-colors">
                <div className="flex items-start gap-3">
                  {app.icon ? (
                    <img src={app.icon} alt={app.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-nebula-600/20 flex items-center justify-center text-xl flex-shrink-0">
                      {app.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{app.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.category}</p>
                    {app.port_map && <p className="text-xs text-muted-foreground font-mono">:{app.port_map}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                  {app.tagline || app.description || "No description"}
                </p>
                <Button size="sm" disabled={installing === app.id || installed.has(app.id)}
                  onClick={() => handleInstall(app.id)}
                  className={installed.has(app.id) ? "bg-green-600/20 text-green-400 border border-green-600/30 hover:bg-green-600/20" : ""}>
                  {installed.has(app.id) ? "Installed" :
                    installing === app.id ? <><span className="w-3 h-3 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Installing...</> :
                    <><Download className="w-3.5 h-3.5 mr-1.5" />Install</>}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && apps.length > 0 && (
            <div className="col-span-4 flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Search className="w-8 h-8 mb-3 opacity-30" />
              <p>No apps match &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* Add custom store */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Add custom store</p>
          <p className="text-xs text-muted-foreground">Any CasaOS-compatible ZIP store URL</p>
        </div>
        <a href="https://awesome.casaos.io/content/3rd-party-app-stores/list.html" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-nebula-400 hover:text-nebula-300 transition-colors">
          Browse stores <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
