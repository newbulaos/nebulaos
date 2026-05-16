"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Square, RotateCcw, Trash2, Terminal } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Container {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
}

interface Props {
  containers: Container[];
  compact?: boolean;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
}

const stateColor: Record<string, string> = {
  running: "bg-green-500",
  exited: "bg-red-500",
  paused: "bg-yellow-500",
  restarting: "bg-blue-500 animate-pulse",
};

export function ContainerList({ containers, compact, onSelect, selectedId }: Props) {
  const qc = useQueryClient();

  const action = useMutation({
    mutationFn: ({ id, act }: { id: string; act: string }) =>
      api.post(`/docker/containers/${id}/${act}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["containers"] }),
  });

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Containers</h3>
        <span className="text-xs text-muted-foreground">{containers.length} total</span>
      </div>
      <div className="divide-y divide-surface-border">
        <AnimatePresence>
          {containers.map((c) => (
            <motion.div
              key={c.Id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn("px-5 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors", selectedId === c.Id && "bg-surface-hover", onSelect && "cursor-pointer")}
              onClick={() => onSelect?.(c.Id)}
            >
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", stateColor[c.State] ?? "bg-gray-500")} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {c.Names[0]?.replace("/", "")}
                </p>
                {!compact && (
                  <p className="text-xs text-muted-foreground truncate">{c.Image}</p>
                )}
              </div>
              {!compact && (
                <div className="flex items-center gap-1">
                  {c.State !== "running" && (
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => action.mutate({ id: c.Id, act: "start" })}
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  )}
                  {c.State === "running" && (
                    <>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => action.mutate({ id: c.Id, act: "stop" })}
                      >
                        <Square className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => action.mutate({ id: c.Id, act: "restart" })}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {containers.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No containers</p>
        )}
      </div>
    </div>
  );
}
