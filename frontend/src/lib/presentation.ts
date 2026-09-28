export const JAKARTA_TIMEZONE = "Asia/Jakarta";

export type RiskLevel = "low" | "medium" | "high";
export type PresentationTone = "success" | "warning" | "danger" | "info" | "neutral";

export const riskPresentation: Record<RiskLevel, { label: string; shortLabel: string; tone: PresentationTone; action: string }> = {
  low: { label: "Terverifikasi", shortLabel: "Aman", tone: "success", action: "Pembayaran dapat diproses" },
  medium: { label: "Perlu diperiksa", shortLabel: "Periksa", tone: "warning", action: "Periksa kembali sebelum memproses pesanan" },
  high: { label: "Berisiko", shortLabel: "Berisiko", tone: "danger", action: "Tahan pesanan dan lakukan pemeriksaan" },
};

export const orderStatusPresentation: Record<string, { label: string; tone: PresentationTone }> = {
  pending: { label: "Menunggu pembayaran", tone: "neutral" },
  awaiting_payment: { label: "Menunggu pembayaran", tone: "warning" },
  paid: { label: "Dibayar", tone: "success" },
  held: { label: "Ditahan", tone: "danger" },
  completed: { label: "Selesai", tone: "success" },
  cancelled: { label: "Dibatalkan", tone: "neutral" },
};

export const paymentStatusPresentation: Record<string, { label: string; tone: PresentationTone }> = {
  pending: { label: "Menunggu konfirmasi", tone: "warning" },
  success: { label: "Berhasil", tone: "success" },
  failed: { label: "Gagal", tone: "danger" },
  expired: { label: "Kedaluwarsa", tone: "neutral" },
  reversed: { label: "Dikembalikan", tone: "danger" },
  refunded: { label: "Dikembalikan", tone: "info" },
};

export const profileStatusPresentation: Record<string, { label: string; tone: PresentationTone }> = {
  active: { label: "Aktif", tone: "success" },
  inactive: { label: "Tidak aktif", tone: "neutral" },
  suspended: { label: "Ditangguhkan", tone: "danger" },
  pending: { label: "Menunggu pemeriksaan", tone: "warning" },
};

export const alertStatusPresentation: Record<string, { label: string; tone: PresentationTone }> = {
  open: { label: "Butuh tindakan", tone: "danger" },
  investigating: { label: "Sedang diperiksa", tone: "warning" },
  resolved: { label: "Selesai", tone: "success" },
  dismissed: { label: "Ditandai aman", tone: "neutral" },
};

export const recommendationPresentation: Record<string, { label: string; message: string; tone: PresentationTone }> = {
  APPROVE: { label: "Proses pesanan", message: "Pembayaran sudah terverifikasi dan sesuai.", tone: "success" },
  VERIFY: { label: "Periksa kembali", message: "Pastikan detail pembayaran sebelum memproses pesanan.", tone: "warning" },
  HOLD: { label: "Tahan sementara", message: "Tahan pesanan sampai pembayaran dikonfirmasi.", tone: "warning" },
  DO_NOT_RELEASE_GOODS: { label: "Jangan serahkan pesanan", message: "Pembayaran belum dapat diverifikasi.", tone: "danger" },
  REPORT_AND_HOLD: { label: "Tahan dan laporkan", message: "Tahan pesanan dan laporkan untuk pemeriksaan.", tone: "danger" },
};

export function normalizeRisk(level?: string | null): RiskLevel {
  return level === "high" || level === "medium" ? level : "low";
}

export function consistentRecommendation(level?: string | null, code?: string | null) {
  const risk = normalizeRisk(level);
  const safeCode = risk === "low" ? "APPROVE" : risk === "medium" ? (code === "HOLD" ? "HOLD" : "VERIFY") : (code === "REPORT_AND_HOLD" ? "REPORT_AND_HOLD" : "DO_NOT_RELEASE_GOODS");
  return { code: safeCode, ...recommendationPresentation[safeCode] };
}

export function paymentDecision(paymentStatus?: string | null, level?: string | null, code?: string | null) {
  if (paymentStatus === "reversed" || paymentStatus === "refunded") {
    return { risk: "high" as const, code: "DO_NOT_RELEASE_GOODS", label: "Tahan pesanan", message: "Pembayaran telah dikembalikan. Jangan serahkan pesanan sebelum pembayaran baru dikonfirmasi.", tone: "danger" as const };
  }
  if (paymentStatus === "failed" || paymentStatus === "expired") {
    return { risk: "high" as const, code: "DO_NOT_RELEASE_GOODS", label: "Jangan serahkan pesanan", message: "Pembayaran tidak berhasil dikonfirmasi.", tone: "danger" as const };
  }
  if (paymentStatus === "pending") {
    return { risk: "medium" as const, code: "VERIFY", label: "Tunggu konfirmasi", message: "Pembayaran masih menunggu konfirmasi penyedia.", tone: "warning" as const };
  }
  return { risk: normalizeRisk(level), ...consistentRecommendation(level, code) };
}

export function paymentBadge(paymentStatus?: string | null, level?: string | null) {
  if (paymentStatus && paymentStatus !== "success") return { kind: "payment" as const, value: paymentStatus };
  return { kind: "risk" as const, value: normalizeRisk(level) };
}

export function splitReasons(reasons?: string[] | string | null) {
  if (!reasons) return [];
  const values = Array.isArray(reasons) ? reasons : [reasons];
  return values.flatMap(reason => reason.split(";")).map(reason => reason.trim()).filter(Boolean);
}

export function humanizeQrisType(value: string) {
  return ({ MPM_STATIC: "QRIS Statis", MPM_DYNAMIC: "QRIS Dinamis", CPM: "QRIS Pelanggan" } as Record<string, string>)[value] ?? value;
}

const demoDescriptionPresentation: Record<string, string> = {
  normal_payment: "Pesanan reguler",
  fake_receipt: "Pembayaran belum ditemukan",
  amount_mismatch: "Nominal pembayaran berbeda",
  duplicate_reference: "Referensi pembayaran ganda",
  delayed_callback: "Konfirmasi pembayaran terlambat",
  repeated_failures: "Pembayaran dicoba kembali",
  suspicious_network: "Pemeriksaan hubungan transaksi",
  cross_region: "Pesanan antarwilayah",
  cross_border: "Pesanan lintas negara",
  merchant_qris_mismatch: "QRIS outlet tidak sesuai",
  reversed_payment: "Pembayaran dikembalikan",
  rapid_micro_transactions: "Pembelian toko",
};

export function humanizeOrderDescription(value?: string | null) {
  if (!value) return "Pesanan merchant";
  const key = value.trim().toLowerCase();
  const scenario = Object.entries(demoDescriptionPresentation).find(([slug]) => key.includes(slug));
  return demoDescriptionPresentation[key] ?? scenario?.[1] ?? value.replaceAll("_", " ").replace(/^\w/, character => character.toUpperCase());
}

export function isJakartaToday(value: string | Date, now = new Date()) {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: JAKARTA_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  return format.format(parseApiDate(value)) === format.format(now);
}

export function parseApiDate(value: string | Date) {
  if (value instanceof Date) return value;
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function jakartaDateKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: JAKARTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parseApiDate(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
