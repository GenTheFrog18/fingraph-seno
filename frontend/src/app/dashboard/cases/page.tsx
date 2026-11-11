"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { Network, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { DataState, PageHeader, StatusBadge, SummaryStrip } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/hooks/use-api";
import type { NetworkCaseDetail, NetworkCaseGraph, NetworkCaseSummary } from "@/lib/types";

cytoscape.use(coseBilkent);

type CaseListResponse = { items: NetworkCaseSummary[] };

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function statusLabel(status: NetworkCaseSummary["status"]) {
  return status === "under_review" ? "Sedang diperiksa" : status === "suspected" ? "Perlu pemeriksaan" : "Ditandai selesai";
}

function scoreLabel(value: number) {
  return `${Math.round(value * 100)} / 100`;
}

export default function CasesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useApi<CaseListResponse>("/cases?limit=100");
  const effectiveSelectedId = selectedId ?? list.data?.items[0]?.id ?? null;
  const detail = useApi<NetworkCaseDetail>(effectiveSelectedId ? `/cases/${effectiveSelectedId}` : null);
  const activeCases = useMemo(
    () => list.data?.items.filter((item) => item.status !== "dismissed").length ?? 0,
    [list.data],
  );

  async function updateStatus(status: "under_review" | "dismissed") {
    if (!effectiveSelectedId) return;
    try {
      await apiFetch(`/cases/${effectiveSelectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "dismissed" ? "Kasus ditandai selesai" : "Kasus masuk pemeriksaan");
      await Promise.all([list.reload(), detail.reload()]);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Status kasus belum dapat diperbarui");
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kasus jaringan"
        description="Tinjau sinyal lintas PSP yang sudah diterima setelah transaksi. Token payer tetap dipseudonimkan dan tidak ditampilkan di ruang kerja ini."
        action={
          <Button variant="outline" onClick={() => void list.reload()} disabled={list.loading}>
            <RefreshCw className={list.loading ? "animate-spin" : ""} />
            Segarkan
          </Button>
        }
      />
      <SummaryStrip
        items={[
          { label: "Kasus aktif", value: activeCases, tone: activeCases ? "danger" : "success" },
          { label: "Total kasus", value: list.data?.items.length ?? 0 },
          { label: "Mode", value: "Post-event", hint: "Bukan keputusan checkout" },
        ]}
      />
      <DataState
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty={!list.loading && !list.error && !list.data?.items.length}
        emptyTitle="Belum ada kasus jaringan"
        emptyDescription="Kasus akan muncul setelah beberapa observasi PSP memenuhi aturan jaringan investigasi."
      >
        {list.data && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]">
            <section className="overflow-hidden rounded-lg border border-border bg-surface" aria-label="Daftar kasus">
              <div className="border-b border-border px-4 py-3 font-technical text-[11px] tracking-[.06em] text-muted-foreground">DAFTAR PEMERIKSAAN</div>
              <div className="divide-y divide-border">
                {list.data.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full p-4 text-left transition-colors hover:bg-muted/50 ${effectiveSelectedId === item.id ? "bg-muted/60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.case_type.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.participants.providers?.join(" · ") || "Provider terbatas"}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium">{scoreLabel(item.risk_score)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{item.payer_link_count} hubungan payer</span>
                      <span className="text-xs text-muted-foreground">{dateFormatter.format(new Date(item.updated_at))}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            <DataState loading={detail.loading} error={detail.error} onRetry={detail.reload} empty={!detail.data} emptyTitle="Pilih kasus" emptyDescription="Pilih kasus dari daftar untuk melihat evidence." >
              {detail.data && <CaseDetail caseItem={detail.data} onUpdate={updateStatus} />}
            </DataState>
          </div>
        )}
      </DataState>
    </div>
  );
}

function CaseDetail({ caseItem, onUpdate }: { caseItem: NetworkCaseDetail; onUpdate: (status: "under_review" | "dismissed") => void }) {
  const graph = useApi<NetworkCaseGraph>(`/cases/${caseItem.id}/graph`);
  const providers = caseItem.participants.providers ?? [];
  const merchants = caseItem.participants.merchants ?? [];
  return (
    <section className="space-y-6 rounded-lg border border-border bg-surface p-5 sm:p-6" aria-label="Detail kasus">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-danger" />
            <h2 className="text-lg font-medium">{caseItem.case_type.replaceAll("_", " ")}</h2>
            <span className="rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">{statusLabel(caseItem.status)}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Prioritas investigasi {scoreLabel(caseItem.risk_score)} · {caseItem.score_semantics.replaceAll("_", " ")}</p>
        </div>
        <div className="flex gap-2">
          {caseItem.status === "suspected" && <Button onClick={() => onUpdate("under_review")}>Mulai pemeriksaan</Button>}
          {caseItem.status !== "dismissed" && <Button variant="outline" onClick={() => onUpdate("dismissed")}>Tandai selesai</Button>}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="PSP terhubung" value={String(providers.length)} detail={providers.join(", ") || "Tidak tersedia"} />
        <Metric label="Merchant terhubung" value={String(merchants.length)} detail="ID namespaced per PSP" />
        <Metric label="Observasi" value={String(caseItem.observations.length)} detail={`${caseItem.payer_link_count} payer links`} />
      </div>
      <div className="border border-border bg-surface-subtle p-4 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground"><Network className="h-4 w-4" /> Evidence graph</div>
        <p className="mt-1">Graph investigation menyertakan payment-to-merchant relationships yang sudah namespaced provider. Payer token sengaja dihilangkan dari respons UI.</p>
        <p className="mt-2 text-xs">{graph.loading ? "Memuat graph…" : graph.data ? `${graph.data.nodes.length} nodes · ${graph.data.edges.length} edges · ${graph.data.privacy}` : graph.error ? graph.error : "Graph belum tersedia"}</p>
      </div>
      {graph.data && <CaseGraph graph={graph.data} />}
      <div>
        <h3 className="font-medium">Observasi yang mendukung</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Merchant</th><th className="px-3 py-2">Acquirer</th><th className="px-3 py-2">Nominal</th><th className="px-3 py-2">Sinyal</th></tr></thead>
            <tbody className="divide-y divide-border">
              {caseItem.observations.map((observation) => <tr key={observation.id}><td className="px-3 py-3 font-medium">{observation.source_provider_id}</td><td className="px-3 py-3">{observation.merchant_ref}</td><td className="px-3 py-3">{observation.acquirer_id}</td><td className="px-3 py-3">Rp {observation.amount_idr.toLocaleString("id-ID")}</td><td className="px-3 py-3">GNN {observation.gnn_score == null ? "fallback" : observation.gnn_score.toFixed(2)} · heuristic {observation.graph_heuristic_score?.toFixed(2) ?? "-"}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <StatusBadge kind="alert" value={caseItem.status === "dismissed" ? "dismissed" : "open"} />
        <span className="rounded-full border border-border px-2.5 py-1">Model artifact: {String(caseItem.model_provenance?.gnn && typeof caseItem.model_provenance.gnn === "object" ? "tercatat" : "fallback")}</span>
      </div>
    </section>
  );
}

function CaseGraph({ graph }: { graph: NetworkCaseGraph }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    cyRef.current?.destroy();
    if (!graph.nodes.length) return;
    const elements: ElementDefinition[] = [
      ...graph.nodes.map((node) => ({
        data: { ...node, id: node.id, title: node.reason ?? node.label },
        classes: node.entity_type ?? "entity",
      })),
      ...graph.edges.map((edge) => ({ data: edge })),
    ];
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      minZoom: 0.35,
      maxZoom: 2.5,
      style: [
        { selector: "node", style: { label: "data(label)", "font-size": 10, "font-family": "Inter, sans-serif", "text-wrap": "wrap", "text-max-width": 110, "background-color": "#111111", color: "#ffffff", width: 34, height: 34, "border-width": 2, "border-color": "#fbfbf5", "text-outline-width": 0 } },
        { selector: "node.merchant", style: { "background-color": "#165e42", shape: "rectangle" } },
        { selector: "node.payer_link", style: { "background-color": "#c9f8d9", color: "#111111", shape: "round-rectangle", "border-color": "#165e42" } },
        { selector: "node.payment", style: { "background-color": "#111111", shape: "ellipse" } },
        { selector: "edge", style: { label: "data(label)", "font-size": 8, "font-family": "Inter, sans-serif", color: "#5c615d", "text-background-color": "#fbfbf5", "text-background-opacity": 0.85, "line-color": "#a8ada6", "target-arrow-color": "#a8ada6", "target-arrow-shape": "triangle", "curve-style": "bezier", width: 1.25 } },
        { selector: "node:selected", style: { "border-color": "#165e42", "border-width": 4 } },
      ] as cytoscape.StylesheetStyle[],
      layout: { name: "cose-bilkent", animate: false, fit: true, padding: 36 } as cytoscape.LayoutOptions,
    });
    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph]);

  return (
      <div className="border border-border bg-surface-subtle p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Payment → merchant dan payment → payer-link</span>
        <span>{graph.truncated ? `Menampilkan ${graph.returned_observations} dari ${graph.total_observations} observasi` : "Seluruh observasi kasus ditampilkan"}</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-2 text-[11px] text-muted-foreground" aria-label="Legenda graph">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full bg-[#111111]" />Payment</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 bg-[#165e42]" />Merchant namespaced</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#c9f8d9] ring-1 ring-[#165e42]" />Payer alias</span>
      </div>
      <div ref={containerRef} className="h-[460px] w-full bg-surface" aria-label="Graph evidence kasus" />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="border border-border bg-surface-subtle p-3"><p className="font-technical text-[10px] tracking-[.04em] text-muted-foreground">{label}</p><p className="mt-1 text-xl font-medium">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></div>;
}
