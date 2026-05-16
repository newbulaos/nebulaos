"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ContainerList } from "@/components/docker/container-list";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ContainerLogs } from "@/components/docker/container-logs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ContainerTerminal = dynamic(
  () => import("@/components/docker/container-terminal").then((m) => m.ContainerTerminal),
  { ssr: false }
);

export default function DockerPage() {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: containers = [], isLoading } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get("/docker/containers").then((r) => Array.isArray(r.data) ? r.data : r.data.containers ?? []),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Docker</h1>
        <p className="text-muted-foreground text-sm">{containers.length} containers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ContainerList
            containers={containers}
            onSelect={setSelected}
            selectedId={selected}
          />
        </div>

        {selected && (
          <div className="lg:col-span-2">
            <Tabs defaultValue="logs">
              <TabsList className="bg-surface-card border border-surface-border">
                <TabsTrigger value="logs">Logs</TabsTrigger>
                <TabsTrigger value="terminal">Terminal</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
              </TabsList>
              <TabsContent value="logs" className="mt-4">
                <ContainerLogs containerId={selected} />
              </TabsContent>
              <TabsContent value="terminal" className="mt-4">
                <ContainerTerminal containerId={selected} />
              </TabsContent>
              <TabsContent value="stats" className="mt-4">
                <p className="text-muted-foreground text-sm">Stats coming soon</p>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
