"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  History,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";
import {
  ActivityTimeline,
  AdvancedAnalysis,
  AIAnalysisCard,
  AmountComparison,
  DataState,
  DecisionBanner,
  DetailList,
  PageHeader,
} from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  humanizeQrisType,
  paymentDecision,
  paymentStatusPresentation,
  splitReasons,
} from "@/lib/presentation";
import type { Payment } from "@/lib/types";
import { useSubscription } from "@/components/providers/subscription-provider";
import { planAtLeast } from "@/lib/plans";

export default function PaymentDetailPage() {
  const { plan } = useSubscription();
  const showGrowthFeatures = planAtLeast(plan, "growth");
  const { id } = useParams<{ id: string }>();
  const query = useApi<Payment>(id ? `/payments/${id}` : null);
  const [saving, setSaving] = useState(false);
  async function decide(
    label: "legitimate" | "suspicious" | "fraud",
    decision: "approve" | "verify" | "hold" | "report",
  ) {
    if (!query.data) return;
    setSaving(true);
    try {
      await apiFetch("/labels", {
        method: "POST",
        body: JSON.stringify({
          payment_event_id: query.data.id,
          label,
          merchant_decision: decision,
        }),
      });
      toast.success("Keputusan tersimpan");
      await query.reload();
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Keputusan belum tersimpan",
      );
    } finally {
      setSaving(false);
    }
  }
  const payment = query.data;
  const recommendation = payment
    ? paymentDecision(
        payment.payment_status,
        payment.risk_level,
        payment.recommendation_code,
      )
    : null;
  const primary =
    recommendation?.risk === "low" ? (
      <Button disabled={saving} onClick={() => decide("legitimate", "approve")}>
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Tandai aman
      </Button>
    ) : recommendation?.risk === "medium" ? (
      <Button disabled={saving} onClick={() => decide("suspicious", "hold")}>
        <PauseCircle className="mr-2 h-4 w-4" />
        Tahan sementara
      </Button>
    ) : (
      <Button
        disabled={saving}
        variant="destructive"
        onClick={() => decide("fraud", "report")}
      >
        <ShieldAlert className="mr-2 h-4 w-4" />
        Laporkan
      </Button>
    );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/payments"
        className="inline-flex min-h-10 items-center text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke pembayaran
      </Link>
      <PageHeader
        title={payment?.provider_reference ?? "Detail pembayaran"}
        description={
          payment
            ? `${payment.outlet_name} · ${formatDateTime(payment.transaction_time)}`
            : "Memuat detail pembayaran"
        }
        action={
          payment && showGrowthFeatures ? (
            <Button asChild variant="outline">
              <Link href={`/dashboard/audit-logs?entity_id=${payment.id}`}>
                <History className="mr-2 h-4 w-4" />
                Lihat riwayat aksi
              </Link>
            </Button>
          ) : undefined
        }
      />
      <DataState
        loading={query.loading}
        error={query.error}
        onRetry={query.reload}
      >
        {payment && recommendation && (
          <>
            <DecisionBanner
              level={recommendation.risk}
              title={recommendation.label}
              message={recommendation.message}
              action={primary}
              secondary={
                recommendation.risk !== "low" ? (
                  <Button
                    disabled={saving}
                    variant="outline"
                    onClick={() => decide("legitimate", "approve")}
                  >
                    Tandai benar
                  </Button>
                ) : undefined
              }
            />
            <AIAnalysisCard
              score={payment.fraud_score}
              confidence={
                payment.confidence_score ??
                payment.scoring?.confidence_score
              }
              reasons={payment.scoring?.reasons}
              mode={payment.analysis_mode ?? payment.scoring?.analysis_mode}
            />
            <AmountComparison
              expected={payment.expected_amount}
              paid={payment.amount}
              currency={payment.currency}
            />
            <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
              <section className="rounded-xl border bg-card p-5 sm:p-6">
                <h2 className="font-medium">Detail konfirmasi</h2>
                <DetailList
                  items={[
                    {
                      label: "Penyedia pembayaran",
                      value: payment.acquirer_name ?? "Simulasi PJP",
                    },
                    {
                      label: "Referensi penyedia",
                      value: payment.provider_reference,
                      mono: true,
                    },
                    {
                      label: "Referensi transaksi",
                      value: payment.transaction_reference,
                      mono: true,
                    },
                    ...(showGrowthFeatures
                      ? [
                          { label: "Kategori", value: payment.category },
                          { label: "Prioritas", value: payment.priority },
                        ]
                      : []),
                    {
                      label: "Status pembayaran",
                      value:
                        paymentStatusPresentation[payment.payment_status]
                          ?.label ?? payment.payment_status,
                    },
                    {
                      label: "Waktu pembayaran",
                      value: formatDateTime(payment.transaction_time),
                    },
                    { label: "Outlet", value: payment.outlet_name },
                    {
                      label: "Profil QRIS",
                      value: payment.qris_type
                        ? humanizeQrisType(payment.qris_type)
                        : "—",
                    },
                  ]}
                />
              </section>
              <section className="rounded-xl border bg-card p-5 sm:p-6">
                <h2 className="font-medium">Mengapa keputusan ini diberikan?</h2>
                <ul className="mt-4 space-y-3">
                  {splitReasons(payment.scoring?.reasons).map((reason) => (
                    <li
                      key={reason}
                      className="flex gap-2.5 text-sm leading-6 text-muted-foreground"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {reason}
                    </li>
                  ))}
                </ul>
                {!splitReasons(payment.scoring?.reasons).length && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Tidak ada alasan tambahan yang tercatat.
                  </p>
                )}
              </section>
            </div>
            <section className="rounded-xl border bg-card p-5 sm:p-6">
              <h2 className="mb-5 font-medium">Riwayat pembayaran</h2>
              <ActivityTimeline
                items={(payment.timeline ?? []).map((item) => ({
                  label: item.label,
                  at: formatDateTime(item.at),
                }))}
              />
            </section>
            <AdvancedAnalysis>
              <DetailList
                items={[
                  {
                    label: "Rule score",
                    value: formatScore(payment.scoring?.rule_score),
                  },
                  {
                    label: "Tabular ML",
                    value: formatScore(payment.scoring?.tabular_score),
                  },
                  ...(planAtLeast(plan, "growth")
                    ? [
                        {
                          label: "Adaptive model",
                          value: formatScore(payment.scoring?.adaptive_score),
                        },
                      ]
                    : []),
                  ...(planAtLeast(plan, "premium")
                    ? [
                        {
                          label: "Graph risk",
                          value: formatScore(payment.scoring?.graph_score),
                        },
                      ]
                    : []),
                  {
                    label: "Model digunakan",
                    value:
                      payment.scoring?.models_used?.join(", ") ||
                      "Rule fallback",
                  },
                  {
                    label: "Mode ensemble",
                    value: payment.scoring?.ensemble_mode ?? "Rule fallback",
                  },
                ]}
              />
            </AdvancedAnalysis>
          </>
        )}
      </DataState>
    </div>
  );
}

function formatScore(value?: number | null) {
  return value == null ? "Tidak digunakan" : `${Math.round(value * 100)}%`;
}
