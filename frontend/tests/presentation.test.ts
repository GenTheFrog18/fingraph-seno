import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { canAccessDashboardPath, dashboardHomeForRole } from "../src/lib/access.ts";
import { alertStatusPresentation, consistentRecommendation, isJakartaToday, orderStatusPresentation, parseApiDate, paymentDecision, riskPresentation, splitReasons } from "../src/lib/presentation.ts";

test("status merchant selalu menggunakan Bahasa Indonesia", () => {
  assert.equal(riskPresentation.low.label, "Terverifikasi");
  assert.equal(riskPresentation.medium.label, "Perlu diperiksa");
  assert.equal(orderStatusPresentation.awaiting_payment.label, "Menunggu pembayaran");
  assert.equal(alertStatusPresentation.open.label, "Butuh tindakan");
});

test("rekomendasi aman tidak dapat berubah menjadi hold atau report", () => {
  assert.equal(consistentRecommendation("low", "REPORT_AND_HOLD").code, "APPROVE");
  assert.equal(consistentRecommendation("medium", "REPORT_AND_HOLD").code, "VERIFY");
  assert.equal(consistentRecommendation("high", "APPROVE").code, "DO_NOT_RELEASE_GOODS");
});

test("alasan semicolon dipisahkan menjadi butir yang mudah dibaca", () => {
  assert.deepEqual(splitReasons("Nominal tidak sesuai; Callback belum diterima"), ["Nominal tidak sesuai", "Callback belum diterima"]);
});

test("tanggal hari ini dihitung dalam zona Asia/Jakarta", () => {
  const now = new Date("2026-07-15T00:30:00+07:00");
  assert.equal(isJakartaToday("2026-07-14T17:10:00Z", now), true);
  assert.equal(isJakartaToday("2026-07-14T16:59:00Z", now), false);
});

test("timestamp UTC tanpa suffix tetap dibaca sebagai UTC", () => {
  assert.equal(parseApiDate("2026-07-14T17:10:00").toISOString(), "2026-07-14T17:10:00.000Z");
});

test("status pembayaran non-sukses tidak pernah menghasilkan tindakan aman", () => {
  assert.equal(paymentDecision("refunded", "low", "APPROVE").risk, "high");
  assert.equal(paymentDecision("pending", "low", "APPROVE").code, "VERIFY");
});

test("route merchant dan analyst dibatasi oleh shell", () => {
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/graph"), false);
  assert.equal(canAccessDashboardPath("analyst", "/dashboard/payments/check"), true);
  assert.equal(canAccessDashboardPath("analyst", "/dashboard/risk-config"), false);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/payments/abc"), true);
  assert.equal(canAccessDashboardPath("admin", "/dashboard/simulation"), true);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/admin-monitoring"), false);
  assert.equal(canAccessDashboardPath("analyst", "/dashboard/admin-monitoring"), false);
  assert.equal(canAccessDashboardPath("admin", "/dashboard/admin-monitoring"), true);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/reports", "basic"), false);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/reports", "growth"), true);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/audit-logs", "growth"), true);
  assert.equal(canAccessDashboardPath("merchant", "/dashboard/graph", "premium"), false);
});

test("dashboard utama merchant, analyst, dan admin berbeda", () => {
  assert.equal(dashboardHomeForRole("merchant"), "merchant-home");
  assert.equal(dashboardHomeForRole("analyst"), "analyst-home");
  assert.equal(dashboardHomeForRole("admin"), "admin-home");
  assert.equal(new Set(["merchant", "analyst", "admin"].map(role => dashboardHomeForRole(role as "merchant" | "analyst" | "admin"))).size, 3);
});

test("landing memakai endpoint agregat publik dan aset logo resmi", async () => {
  const landing = await readFile("src/app/page.tsx", "utf8");
  const logo = await readFile("src/components/layout/app-logo.tsx", "utf8");
  const metrics = await readFile("src/components/product/public-trust-metrics.tsx", "utf8");
  assert.ok(landing.includes("<PublicTrustMetrics />"));
  assert.ok(metrics.includes('"/public/trust-summary"'));
  assert.doesNotMatch(metrics, /registered_users:\s*\d/);
  assert.ok(logo.includes('"/globe.svg"'));
  assert.equal((landing.match(/href="#cara-kerja"/g) ?? []).length >= 2, true);
  assert.ok(landing.includes("Untuk investigator"));
  assert.doesNotMatch(landing, /Masuk ke dasbor/);
  assert.ok(landing.includes("landing-fixed-theme"));
  assert.ok(landing.includes("Risiko {score}/100 · Keyakinan {confidence}%"));
});

test("detail pembayaran menampilkan skor, confidence, mode, dan alasan", async () => {
  const detail = await readFile("src/app/dashboard/payments/[id]/page.tsx", "utf8");
  const component = await readFile("src/components/product/ui.tsx", "utf8");
  assert.ok(detail.includes("<AIAnalysisCard"));
  assert.ok(component.includes("Skor risiko"));
  assert.ok(component.includes("Keyakinan analisis"));
  assert.ok(component.includes("Alasan utama:"));
  assert.ok(component.includes("Mode aman: aturan dan hubungan transaksi"));
});
