export type PlanCode = "basic" | "growth" | "premium";

export type PlanDefinition = {
  code: PlanCode;
  name: string;
  price: number;
  audience: string;
  summary: string;
  transactionLimit: number;
  outletLimit: number | null;
  seatLimit: number;
  support: string;
  featured?: boolean;
  features: string[];
};

export const planCatalog: PlanDefinition[] = [
  {
    code: "basic",
    name: "Basic",
    price: 49_000,
    audience: "Untuk usaha mikro dan satu outlet",
    summary: "Perlindungan penting untuk mulai memeriksa pembayaran dengan lebih yakin.",
    transactionLimit: 500,
    outletLimit: 1,
    seatLimit: 1,
    support: "Email dan pusat bantuan",
    features: [
      "Fraud score dan klasifikasi risiko",
      "Dashboard ringkas dengan 4 metrik utama",
      "Peringatan transaksi secara real-time",
      "Rekomendasi tinjau, tahan, atau verifikasi",
      "Riwayat transaksi dan label manual",
      "1 akun merchant dan 1 outlet",
    ],
  },
  {
    code: "growth",
    name: "Growth",
    price: 99_000,
    audience: "Untuk tim kecil dan beberapa outlet",
    summary: "Kontrol operasional lengkap saat usaha mulai berkembang dan dikelola bersama.",
    transactionLimit: 2_000,
    outletLimit: 3,
    seatLimit: 3,
    support: "Prioritas melalui WhatsApp/chat",
    featured: true,
    features: [
      "Semua fitur Basic",
      "Dashboard penuh dengan filter periode, outlet, dan prioritas",
      "Hingga 3 outlet dan 3 akun pengguna",
      "Kategori dan prioritas transaksi",
      "Laporan server-side dan export CSV",
      "Action Log yang terhubung ke transaksi",
    ],
  },
  {
    code: "premium",
    name: "Premium",
    price: 149_000,
    audience: "Untuk multi cabang dan operasi lintas wilayah",
    summary: "Intelijen risiko lanjutan untuk usaha yang membutuhkan kontrol dan integrasi lebih jauh.",
    transactionLimit: 5_000,
    outletLimit: null,
    seatLimit: 5,
    support: "Dedicated onboarding dan video call",
    features: [
      "Semua fitur Growth",
      "5+ akun termasuk akses admin penuh",
      "Admin Activity Monitoring dan audit trail",
      "Graph Explorer dan analisis pola kompleks",
      "Cross-Border Intelligence",
      "Federated Learning tanpa berbagi data mentah",
      "API access untuk integrasi POS/marketplace",
    ],
  },
];

const planRank: Record<PlanCode, number> = { basic: 0, growth: 1, premium: 2 };

export function normalizePlan(value?: string | null): PlanCode {
  return value === "growth" || value === "premium" ? value : "basic";
}

export function planAtLeast(current: PlanCode, required: PlanCode) {
  return planRank[current] >= planRank[required];
}

export function planByCode(code: PlanCode) {
  return planCatalog.find((plan) => plan.code === code) ?? planCatalog[0];
}

export function formatPlanPrice(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function requiredPlanForPath(path: string): PlanCode {
  if (
    path.startsWith("/dashboard/graph") ||
    path.startsWith("/dashboard/cross-border") ||
    path.startsWith("/dashboard/federated") ||
    path.startsWith("/dashboard/admin-monitoring") ||
    path.startsWith("/dashboard/risk-config") ||
    path.startsWith("/dashboard/simulation")
  ) {
    return "premium";
  }
  if (
    path.startsWith("/dashboard/reports") ||
    path.startsWith("/dashboard/audit-logs")
  ) {
    return "growth";
  }
  return "basic";
}
