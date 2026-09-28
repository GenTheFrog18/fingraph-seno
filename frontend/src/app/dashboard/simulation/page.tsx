"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { DataState, PageHeader, StatusBadge } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { paymentDecision } from "@/lib/presentation";

type Scenario = { name: string; description: string };
type RunResult = {
  scenario: string;
  payment: {
    id: string;
    provider_reference: string;
    payment_status?: string;
    fraud_score: number;
    risk_level: string;
    recommendation: string;
    recommendation_code?: string;
  };
  alert_created: boolean;
};

export default function DemoLabPage() {
  const query = useApi<{ items: Scenario[] }>("/demo/qris/scenarios");
  const [running, setRunning] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  async function run(name: string) {
    setRunning(name);
    try {
      const value = await apiFetch<RunResult>(`/demo/qris/scenarios/${name}`, {
        method: "POST",
      });
      setResult(value);
      toast.success("Skenario selesai dijalankan");
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Skenario belum dapat dijalankan",
      );
    } finally {
      setRunning("");
    }
  }
  const decision = result
    ? paymentDecision(
        result.payment.payment_status ?? "success",
        result.payment.risk_level,
        result.payment.recommendation_code,
      )
    : null;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Laboratorium Demo"
        description="Jalankan skenario PJP simulasi untuk menghasilkan pembayaran, penilaian risiko, alert, audit, dan sinkronisasi graph."
      />
      {result && decision && (
        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge value={decision.risk} />
              <span className="font-technical text-xs text-muted-foreground">
                {result.payment.provider_reference}
              </span>
            </div>
            <p className="mt-3 font-medium">{decision.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Skor {Math.round(result.payment.fraud_score * 100)} dari 100 ·{" "}
              {result.alert_created ? "Alert dibuat" : "Tanpa alert"}
            </p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/payments/${result.payment.id}`}>
              Buka hasil lengkap
            </Link>
          </Button>
        </section>
      )}
      <DataState
        loading={query.loading}
        error={query.error}
        empty={query.data?.items.length === 0}
        onRetry={query.reload}
      >
        {query.data && (
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="divide-y">
              {query.data.items.map((item) => (
                <div
                  key={item.name}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-technical text-xs font-medium text-primary">
                      {item.name}
                    </p>
                    <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    className="shrink-0"
                    variant="outline"
                    disabled={Boolean(running)}
                    onClick={() => run(item.name)}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {running === item.name ? "Menjalankan…" : "Jalankan"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </DataState>
    </div>
  );
}
