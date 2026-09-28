"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { ConfirmDialog } from "@/components/product/interactions";
import { AIAnalysisInline, StatusBadge } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { splitReasons } from "@/lib/presentation";
import type { AlertItem } from "@/lib/types";

export function AlertListItem({
  alert,
  onStart,
  onResolve,
}: {
  alert: AlertItem;
  onStart: (id: string) => Promise<void>;
  onResolve: (id: string) => void;
}) {
  const router = useRouter();
  const severe = alert.severity === "critical" || alert.risk_score >= 0.7;
  async function inspect() {
    if (alert.status === "open") await onStart(alert.id);
    if (alert.payment_event_id)
      router.push(`/dashboard/payments/${alert.payment_event_id}`);
  }
  return (
    <article className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          className={
            severe
              ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger"
              : "grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning"
          }
        >
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="alert" value={alert.status} />
            {alert.payment && (
              <span
                className="max-w-[220px] truncate font-technical text-xs text-muted-foreground"
                title={alert.payment.provider_reference}
              >
                {alert.payment.provider_reference}
              </span>
            )}
          </div>
          <p className="mt-2 font-medium">
            {alert.payment
              ? formatCurrency(alert.payment.amount, alert.payment.currency)
              : "Pembayaran perlu ditinjau"}
          </p>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {splitReasons(alert.reason)[0] ?? alert.recommendation}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(alert.created_at)}
          </p>
          <div className="mt-1.5">
            <AIAnalysisInline
              score={alert.payment?.fraud_score ?? alert.risk_score}
              confidence={alert.payment?.confidence_score}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {(alert.status === "open" || alert.status === "investigating") &&
            alert.payment_event_id && (
              <Button
                onClick={() => {
                  void inspect();
                }}
              >
                {alert.status === "open"
                  ? "Periksa pembayaran"
                  : "Lanjutkan pemeriksaan"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          {alert.status === "investigating" && (
            <ConfirmDialog
              trigger={
                <Button variant="outline">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Selesaikan
                </Button>
              }
              title="Selesaikan pemeriksaan?"
              description="Peringatan akan dipindahkan ke riwayat selesai. Detail pembayaran dan audit tetap tersimpan."
              confirmLabel="Selesaikan"
              onConfirm={() => onResolve(alert.id)}
            />
          )}
          {alert.status !== "open" &&
            alert.status !== "investigating" &&
            alert.payment_event_id && (
              <Link
                href={`/dashboard/payments/${alert.payment_event_id}`}
                className="inline-flex min-h-11 items-center text-sm font-medium text-primary"
              >
                Lihat detail
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            )}
        </div>
      </div>
    </article>
  );
}
