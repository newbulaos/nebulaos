"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Folder, File, ChevronRight, Home, Upload, Download, Trash2, FolderPlus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FsEntry {
  name: string;
  type: "dir" | "file";
  size?: number;
  modified?: string;
  children?: FsEntry[];
}

// Mock filesystem tree
const MOCK_FS: FsEntry[] = [
  { name: "home", type: "dir", children: [
    { name: "cel", type: "dir", children: [
      { name: "documents", type: "dir", children: [
        { name: "report.pdf", type: "file", size: 204800, modified: "2026-05-10" },
        { name: "notes.txt", type: "file", size: 1024, modified: "2026-05-14" },
      ]},
      { name: "downloads", type: "dir", children: [
        { name: "ubuntu-24.04.iso", type: "file", size: 2147483648, modified: "2026-05-01" },
      ]},
      { name: ".bashrc", type: "file", size: 3808, modified: "2026-05-07" },
    ]},
  ]},
  { name: "etc", type: "dir", children: [
    { name: "nginx", type: "dir", children: [
      { name: "nginx.conf", type: "file", size: 2048, modified: "2026-04-20" },
    ]},
    { name: "hosts", type: "file", size: 512, modified: "2026-03-01" },
  ]},
  { name: "var", type: "dir", children: [
    { name: "log", type: "dir", children: [
      { name: "syslog", type: "file", size: 10485760, modified: "2026-05-16" },
      { name: "auth.log", type: "file", size: 524288, modified: "2026-05-16" },
    ]},
  ]},
];

function fmt(bytes?: number) {
  if (!bytes) return "—";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function findDir(entries: FsEntry[], path: string[]): FsEntry[] {
  if (path.length === 0) return entries;
  const next = entries.find((e) => e.name === path[0] && e.type === "dir");
  if (!next?.children) return [];
  return findDir(next.children, path.slice(1));
}

export default function FilesPage() {
  const [path, setPath] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const entries = findDir(MOCK_FS, path);

  const navigate = (name: string) => {
    setPath((p) => [...p, name]);
    setSelected(null);
  };

  const goUp = () => {
    setPath((p) => p.slice(0, -1));
    setSelected(null);
  };

  const goTo = (idx: number) => {
    setPath((p) => p.slice(0, idx + 1));
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">File Manager</h1>
          <p className="text-muted-foreground text-sm">Browse and manage server files</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="border border-surface-border text-muted-foreground" disabled>
            <FolderPlus className="w-4 h-4 mr-1.5" /> New Folder
          </Button>
          <Button variant="ghost" size="sm" className="border border-surface-border text-muted-foreground" disabled>
            <Upload className="w-4 h-4 mr-1.5" /> Upload
          </Button>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
          <button onClick={goUp} disabled={path.length === 0}
            className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm flex-1 overflow-x-auto">
            <button onClick={() => setPath([])} className="flex items-center gap-1 text-muted-foreground hover:text-white transition-colors">
              <Home className="w-3.5 h-3.5" /> /
            </button>
            {path.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                <button onClick={() => goTo(i)} className={cn("hover:text-white transition-colors", i === path.length - 1 ? "text-white" : "text-muted-foreground")}>
                  {seg}
                </button>
              </span>
            ))}
          </div>
          {selected && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" disabled>
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" disabled>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* File list */}
        <div className="divide-y divide-surface-border">
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-xs text-muted-foreground uppercase tracking-wide">
            <span className="col-span-6">Name</span>
            <span className="col-span-3">Modified</span>
            <span className="col-span-3 text-right">Size</span>
          </div>
          {entries.map((entry) => (
            <motion.div key={entry.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={cn("grid grid-cols-12 px-4 py-2.5 items-center cursor-pointer hover:bg-surface-hover transition-colors",
                selected === entry.name && "bg-surface-hover")}
              onClick={() => setSelected(entry.name)}
              onDoubleClick={() => entry.type === "dir" && navigate(entry.name)}>
              <div className="col-span-6 flex items-center gap-2.5">
                {entry.type === "dir"
                  ? <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  : <File className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                <span className="text-sm text-white truncate">{entry.name}</span>
              </div>
              <span className="col-span-3 text-xs text-muted-foreground">{entry.modified ?? "—"}</span>
              <span className="col-span-3 text-xs text-muted-foreground text-right">
                {entry.type === "dir" ? "—" : fmt(entry.size)}
              </span>
            </motion.div>
          ))}
          {entries.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Empty directory</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ⚠️ File operations (upload, download, delete) require backend v1.1
      </p>
    </div>
  );
}
