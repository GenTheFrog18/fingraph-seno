"use client";

import { useState } from "react";
import { BrainCircuit, DatabaseZap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  DataState,
  DetailList,
  EmptyState,
  PageHeader,
  StatusBadge,
  SummaryStrip,
} from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";

type Model = {
  dataset_name?: string;
  model_name?: string;
  model_family?: string;
  version?: string;
  created_at?: string;
  sample_count?: number;
  dataset_rows?: number;
  roc_auc?: number;
  pr_auc?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  metrics?: Record<string, unknown>;
};
type Adaptive = {
  qris: {
    labels_available: number;
    usable_binary_labels: number;
    labels_required: number;
    ready_for_training: boolean;
    class_distribution: Record<string, number>;
  };
};
type GraphStatus = {
  prototype: boolean;
  model_available: boolean;
  active_model?: Model | null;
  fallback: string;
  note: string;
};
export default function ModelsPage() {
  const user = getStoredUser();
  const models = useApi<{ items: Model[] }>("/ml/models");
  const adaptive = useApi<Adaptive>("/ml/adaptive/status");
  const graph = useApi<GraphStatus>("/ml/graphsage/status");
  const [training, setTraining] = useState("");
  async function train(kind: "qris" | "adaptive") {
    setTraining(kind);
    try {
      await apiFetch(
        kind === "qris"
          ? "/ml/train/qris-tabular"
          : "/ml/adaptive/qris-retrain",
        { method: "POST" },
      );
      toast.success(
        kind === "qris"
          ? "Model QRIS selesai dilatih"
          : "Model adaptive selesai dilatih",
      );
      await Promise.all([models.reload(), adaptive.reload(), graph.reload()]);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Training belum dapat dijalankan",
      );
    } finally {
      setTraining("");
    }
  }
  const latest = models.data?.items[0];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Model"
        description="Pantau artifact, kesiapan adaptive learning, dan fallback yang digunakan scoring."
        action={
          <Button
            variant="outline"
            onClick={() => {
              void models.reload();
              void adaptive.reload();
              void graph.reload();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Muat ulang
          </Button>
        }
      />
      <DataState
        loading={models.loading || adaptive.loading || graph.loading}
        error={models.error || adaptive.error || graph.error}
        onRetry={models.reload}
      >
        {models.data && adaptive.data && graph.data && (
          <>
            <SummaryStrip
              items={[
                { label: "Artifact model", value: models.data.items.length },
                {
                  label: "Label tersedia",
                  value: adaptive.data.qris.labels_available,
                },
                {
                  label: "Siap adaptive",
                  value: adaptive.data.qris.ready_for_training ? "Ya" : "Belum",
                  tone: adaptive.data.qris.ready_for_training
                    ? "success"
                    : "warning",
                },
                {
                  label: "GraphSAGE",
                  value: graph.data.model_available ? "Tersedia" : "Fallback",
                  tone: "info",
                },
              ]}
            />
            <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
              <section className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <div>
                    <h2 className="font-medium">Registry model</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Artifact lokal dan metadata training
                    </p>
                  </div>
                  <BrainCircuit className="h-5 w-5 text-primary" />
                </div>
                {models.data.items.length ? (
                  <div className="divide-y">
                    {models.data.items.map((model, index) => (
                      <article
                        key={`${model.version}-${index}`}
                        className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_140px_150px]"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {model.model_name ||
                                model.model_family ||
                                "Model FinGraph"}
                            </p>
                            <StatusBadge
                              kind="payment"
                              value={index === 0 ? "success" : "pending"}
                            />
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {model.dataset_name || "Dataset internal"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Sampel
                          </p>
                          <p className="mt-1 font-technical text-xs">
                            {model.sample_count ?? model.dataset_rows ?? "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Versi</p>
                          <p className="mt-1 truncate font-technical text-xs">
                            {model.version || "—"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada artifact model"
                    description="Scoring tetap menggunakan rule guard dan graph heuristic."
                  />
                )}
              </section>
              <div className="space-y-6">
                <section className="rounded-xl border bg-card p-5">
                  <h2 className="font-medium">Adaptive learning</h2>
                  <div className="mt-4">
                    <DetailList
                      items={[
                        {
                          label: "Label valid",
                          value: String(
                            adaptive.data.qris.usable_binary_labels,
                          ),
                        },
                        {
                          label: "Minimum",
                          value: String(adaptive.data.qris.labels_required),
                        },
                        {
                          label: "Fraud",
                          value: String(
                            adaptive.data.qris.class_distribution.fraud ?? 0,
                          ),
                        },
                        {
                          label: "Legitimate",
                          value: String(
                            adaptive.data.qris.class_distribution.legitimate ??
                              0,
                          ),
                        },
                      ]}
                    />
                  </div>
                  {user?.role === "admin" && (
                    <div className="mt-4 grid gap-2">
                      <Button
                        onClick={() => train("qris")}
                        disabled={Boolean(training)}
                      >
                        <DatabaseZap className="mr-2 h-4 w-4" />
                        {training === "qris" ? "Melatih…" : "Latih model QRIS"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => train("adaptive")}
                        disabled={
                          Boolean(training) ||
                          !adaptive.data.qris.ready_for_training
                        }
                      >
                        {training === "adaptive"
                          ? "Melatih…"
                          : "Latih adaptive"}
                      </Button>
                    </div>
                  )}
                </section>
                <section className="rounded-xl border bg-card p-5">
                  <h2 className="font-medium">GraphSAGE prototype</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {graph.data.note}
                  </p>
                  <p className="mt-3 font-technical text-xs text-primary">
                    Fallback: {graph.data.fallback}
                  </p>
                </section>
                {latest?.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Artifact terbaru: {formatDateTime(latest.created_at)}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
