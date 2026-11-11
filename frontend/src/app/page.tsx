import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  CircleCheckBig,
  EyeOff,
  FileWarning,
  Globe2,
  Menu,
  QrCode,
  ReceiptText,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { AppLogo } from "@/components/layout/app-logo";
import { Reveal } from "@/components/marketing/reveal";
import { PublicTrustMetrics } from "@/components/product/public-trust-metrics";
import { Button } from "@/components/ui/button";

const problems = [
  {
    icon: FileWarning,
    number: "01",
    title: "Sinyal tersebar di banyak PSP.",
    body: "Event provider yang terpisah tidak cukup untuk melihat hubungan merchant dan payer link yang berulang.",
  },
  {
    icon: ReceiptText,
    number: "02",
    title: "Identitas tidak boleh digabung sembarangan.",
    body: "Namespace provider dan issuer menjaga merchant serta payer link tetap dapat ditelusuri tanpa membuka token mentah.",
  },
  {
    icon: RotateCcw,
    number: "03",
    title: "Prioritas perlu evidence yang dapat diaudit.",
    body: "GNN, heuristic topology, alasan edge, dan riwayat keputusan disajikan bersama dalam satu kasus.",
  },
];

const features = [
  ["Ingestion signed", "HMAC provider, freshness window, dan idempotensi mencegah event palsu atau ganda."],
  ["Case evidence", "Observasi, edge reason, dan provenance model mengikuti kasus lintas PSP."],
  ["Graph investigation", "Cytoscape memperlihatkan payment, merchant namespaced, dan payer alias case-local."],
  ["Audit keputusan", "Status review, dismissal, dan automatic reopen meninggalkan riwayat yang dapat ditinjau."],
];

const steps = [
  {
    number: "01",
    icon: ReceiptText,
    title: "Event PSP diterima",
    body: "Event QRIS ditandatangani oleh PSP dan dicatat sebagai observation yang idempotent.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "Graph menghubungkan sinyal",
    body: "Payer link berscope issuer, merchant namespaced, dan riwayat terbaru diproses bersama GNN.",
  },
  {
    number: "03",
    icon: CircleCheckBig,
    title: "Investigator meninjau",
    body: "Kasus dibuka dengan provenance model, alasan edge, audit status, dan alias payer case-local.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-fixed-theme min-h-screen overflow-x-clip bg-black text-white">
      <PublicHeader />

      <section className="bg-black">
        <Reveal className="mx-auto max-w-[1240px] px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:pt-32">
          <p className="text-xs font-normal tracking-[.08em] text-zinc-400">
            INTELIJEN FRAUD QRIS LINTAS PSP
          </p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1.25fr_.55fr] lg:items-end">
            <h1 className="font-display max-w-[1040px] text-[46px] font-light leading-[.98] tracking-[-.035em] sm:text-[66px] lg:text-[88px]">
              Hubungkan sinyal fraud QRIS lintas PSP sebelum jaringan makin luas.
            </h1>
            <div className="pb-2">
              <p className="text-base font-normal leading-7 text-zinc-300 lg:text-lg">
                FinGraph memberi investigator sentral ruang kerja untuk menerima
                event terautentikasi, menggabungkan graph evidence, dan meninjau
                prioritas kasus berbasis GNN.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-7 h-12 border-2 border-white bg-white px-6 text-black hover:bg-zinc-200"
              >
                <Link href="/login">
                  Buka ruang investigasi
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <p className="mt-5 text-xs leading-5 text-zinc-400">
                Mode Demo memakai event sintetis enam transaksi dari tiga PSP.
                Tidak terhubung ke Bank Indonesia, bank, atau PJP nyata.
              </p>
            </div>
          </div>
        </Reveal>

        <div
          data-testid="hero-visual"
          className="relative mx-auto h-[360px] w-full max-w-[1600px] overflow-hidden sm:h-[500px] lg:h-[620px]"
        >
          <Reveal className="relative h-full w-full" delay={120}>
            <Image
              src="/fingraph-merchant-hero.png"
              alt="Investigator memeriksa graph evidence QRIS lintas PSP"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[66%_center]"
            />
          </Reveal>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-black">
        <div className="mx-auto grid max-w-[1240px] gap-4 px-4 py-6 text-sm text-zinc-300 sm:grid-cols-3 sm:px-6">
          {[
            "Verifikasi nominal",
            "Konfirmasi pembayaran",
            "Peringatan tindakan",
          ].map((label, index) => (
            <div key={label} className="flex items-center gap-3">
              <span className="font-technical text-xs text-zinc-500">0{index + 1}</span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <PublicTrustMetrics />

      <section id="untuk-investigator" className="bg-black py-20 sm:py-28">
        <Reveal className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="max-w-4xl">
            <p className="text-xs tracking-[.08em] text-zinc-500">MASALAH INVESTIGASI LINTAS PSP</p>
            <h2 className="font-display mt-6 text-[42px] font-light leading-[1.08] tracking-[-.03em] sm:text-[62px]">
              Sinyal fraud tersebar. Jaringan tidak boleh ikut tersembunyi.
            </h2>
          </div>
          <div className="mt-16 divide-y divide-zinc-800 border-y border-zinc-800">
            {problems.map(({ icon: Icon, number, title, body }) => (
              <article
                key={number}
                className="grid gap-5 py-8 sm:grid-cols-[64px_1fr_1fr] sm:items-start lg:py-10"
              >
                <div className="flex items-center gap-3 text-zinc-500">
                  <Icon className="h-5 w-5 text-white" />
                  <span className="font-technical text-xs">{number}</span>
                </div>
                <h3 className="text-xl font-medium leading-7">{title}</h3>
                <p className="max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="cara-kerja" className="bg-[#0a0a0a] py-20 sm:py-28">
        <Reveal className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <p className="text-xs tracking-[.08em] text-zinc-500">CARA KERJA</p>
          <h2 className="font-display mt-6 max-w-3xl text-[42px] font-light leading-[1.08] tracking-[-.03em] sm:text-[58px]">
            Tiga langkah. Satu keputusan yang jelas.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-zinc-800 bg-zinc-800 md:grid-cols-3">
            {steps.map(({ number, icon: Icon, title, body }) => (
              <li key={number} className="min-h-[290px] bg-[#0a0a0a] p-7 sm:p-9">
                <div className="flex items-start justify-between">
                  <span className="grid h-16 w-16 place-items-center rounded-xl border border-zinc-700 bg-zinc-900 text-white">
                    <Icon className="h-8 w-8" strokeWidth={1.45} />
                  </span>
                  <span className="font-technical text-xs text-zinc-600">{number}</span>
                </div>
                <h3 className="mt-10 text-[22px] font-medium">{title}</h3>
                <p className="mt-3 max-w-sm text-base leading-7 text-zinc-400">{body}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>

      <section id="fitur" className="bg-[#fbfbf5] py-20 text-black sm:py-28">
        <Reveal className="mx-auto grid max-w-[1240px] items-start gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_.95fr]">
          <PaymentWorkspacePreview />
          <div className="lg:pt-5">
            <span className="inline-flex rounded-full bg-[#c1fbd4] px-3 py-1.5 text-xs tracking-[.06em]">
              RUANG KERJA INVESTIGATOR
            </span>
            <h2 className="font-display mt-6 text-[42px] font-light leading-[1.08] tracking-[-.03em] sm:text-[55px]">
              Dari event signed menjadi kasus yang dapat ditindaklanjuti.
            </h2>
            <div className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
              {features.map(([title, body]) => (
                <div key={title} className="grid gap-2 py-5 sm:grid-cols-[190px_1fr]">
                  <h3 className="font-medium">{title}</h3>
                  <p className="text-sm leading-6 text-zinc-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="operasi" className="bg-[#fbfbf5] py-20 text-black sm:py-28">
        <Reveal className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[.08em] text-zinc-500">OPERASI FINGRAPH</p>
            <h2 className="font-display mt-6 text-[44px] font-light leading-[1.08] tracking-[-.03em] sm:text-[58px]">
              Satu lapisan intelijen untuk jaringan pembayaran yang tersebar.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              FinGraph menerima observasi signed dari PSP yang berpartisipasi,
              menghubungkan sinyal secara terbatas, lalu menyajikannya sebagai
              kasus yang dapat diperiksa oleh tim berwenang.
            </p>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-zinc-200 bg-zinc-200 md:grid-cols-3">
            {[
              ["01", "Integrasi PSP", "Event QRIS diverifikasi dengan HMAC, freshness window, dan idempotensi provider."],
              ["02", "Graph dan model", "GraphSAGE dan heuristic topology membantu memprioritaskan hubungan yang perlu dilihat."],
              ["03", "Ruang investigator", "Evidence, provenance, dan keputusan status tersimpan dalam satu alur audit."],
            ].map(([number, title, body]) => (
              <article key={number} className="min-h-[220px] bg-[#fbfbf5] p-7 sm:p-9">
                <span className="font-technical text-xs text-zinc-500">{number}</span>
                <h3 className="mt-12 text-xl font-medium">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600">{body}</p>
              </article>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="kontak" className="bg-[#fbfbf5] pb-20 text-black sm:pb-28">
        <Reveal className="mx-auto grid max-w-[1240px] gap-8 border-t border-zinc-200 px-4 pt-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs tracking-[.08em] text-zinc-500">TENTANG DAN KONTAK</p>
            <h2 className="font-display mt-5 text-[36px] font-light leading-[1.08] tracking-[-.03em] sm:text-[48px]">
              Dibuat untuk percakapan teknis yang lebih tajam.
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Tinjau alur demo, pahami batas data, dan gunakan ruang investigasi
              untuk melihat bagaimana sinyal lintas PSP dirangkai menjadi evidence.
            </p>
          </div>
          <Button asChild variant="outline" size="lg" className="w-fit">
            <Link href="/login">Hubungi melalui ruang demo <ArrowRight className="ml-2" /></Link>
          </Button>
        </Reveal>
      </section>

      <section className="bg-[#d4f9e0] py-14 text-black">
        <Reveal className="mx-auto grid max-w-[1240px] gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex gap-4">
            <EyeOff className="mt-1 h-6 w-6 shrink-0" />
            <div>
              <h2 className="text-xl font-medium">Privasi ikut dirancang dari awal.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
                Payer token tidak pernah dikirim ke UI. Investigator melihat alias
                HMAC yang hanya valid dalam konteks kasusnya.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-5 text-sm font-medium">
            <span className="flex items-center gap-2"><Globe2 className="h-4 w-4" />Lintas wilayah</span>
            <span className="flex items-center gap-2"><QrCode className="h-4 w-4" />QRIS Mode Demo</span>
          </div>
        </Reveal>
      </section>

      <section className="bg-black py-20 sm:py-28">
        <Reveal className="mx-auto flex max-w-[900px] flex-col items-center px-4 text-center sm:px-6">
          <span className="grid h-16 w-16 place-items-center rounded-xl border border-zinc-800 bg-zinc-900">
            <ShieldCheck className="h-8 w-8" strokeWidth={1.5} />
          </span>
          <h2 className="font-display mt-8 text-[46px] font-light leading-[1.05] tracking-[-.03em] sm:text-[70px]">
            Sinyal terhubung. Investigasi lebih tajam.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
            Satu ruang kerja untuk menghubungkan event QRIS lintas PSP,
            memahami prioritas model, dan mendokumentasikan keputusan.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-9 h-12 border-2 border-white bg-white px-6 text-black hover:bg-zinc-200"
          >
            <Link href="/login">Masuk ke Mode Demo <ArrowRight className="ml-2" /></Link>
          </Button>
          <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-zinc-400">
            {["Nominal dicocokkan", "Alasan dijelaskan", "Tindakan tercatat"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-white" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-zinc-800 bg-black">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-16 sm:grid-cols-[1fr_auto] sm:items-end sm:px-6">
          <div>
            <AppLogo inverted />
            <p className="mt-5 max-w-md text-sm leading-6 text-zinc-500">
              FinGraph membantu tim institusional menghubungkan sinyal fraud
              QRIS lintas PSP dengan evidence dan audit yang jelas.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#untuk-investigator">Untuk investigator</a>
            <a href="#fitur">Fitur</a>
            <a href="#operasi">Operasi</a>
            <a href="#kontak">Contact</a>
            <Link href="/login">Masuk</Link>
          </div>
        </div>
        <div className="border-t border-zinc-900 px-4 py-5 text-center text-xs text-zinc-600">
          © 2026 FinGraph QRIS · Mode Demo untuk pembelajaran dan demonstrasi.
        </div>
      </footer>
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black text-white">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <AppLogo inverted />
        <nav className="hidden items-center gap-8 text-[15px] text-zinc-300 md:flex" aria-label="Navigasi utama">
          <a href="#cara-kerja" className="hover:text-white">Cara kerja</a>
          <a href="#untuk-investigator" className="hover:text-white">Untuk investigator</a>
          <a href="#fitur" className="hover:text-white">Fitur</a>
          <a href="#operasi" className="hover:text-white">Operasi</a>
          <a href="#kontak" className="hover:text-white">Contact</a>
        </nav>
        <div className="hidden items-center sm:flex">
          <Button asChild className="h-11 bg-white px-5 text-black hover:bg-zinc-200">
            <Link href="/login">Masuk</Link>
          </Button>
        </div>
        <details className="relative sm:hidden">
          <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full border border-zinc-700" aria-label="Buka navigasi">
            <Menu className="h-5 w-5" />
          </summary>
          <div className="absolute right-0 top-14 w-64 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-2 shadow-2xl">
            {[
              ["#cara-kerja", "Cara kerja"],
              ["#untuk-investigator", "Untuk investigator"],
              ["#fitur", "Fitur"],
              ["#operasi", "Operasi"],
              ["#kontak", "Contact"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="block rounded-full px-4 py-3 text-sm">{label}</a>
            ))}
            <Link href="/login" className="mt-1 block rounded-full bg-white px-4 py-3 text-center text-sm font-medium text-black">
              Masuk
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

function PaymentWorkspacePreview() {
  const rows = [
    ["psp_a", "merchant_alpha", "Perlu diperiksa", "57", "45", "text-[#8a5600] bg-[#fff3d6]"],
    ["psp_b", "merchant_beta", "Terhubung", "44", "41", "text-[#165e42] bg-[#e5f6eb]"],
    ["psp_c", "merchant_gamma", "Perlu diperiksa", "62", "43", "text-[#8a5600] bg-[#fff3d6]"],
  ];
  return (
    <div className="border border-zinc-200 bg-white p-3 sm:p-5">
      <div className="flex items-center justify-between px-2 py-3">
        <div>
          <p className="font-medium">Kasus terpilih</p>
          <p className="mt-1 text-xs text-zinc-500">Koordinasi merchant · 3 PSP</p>
        </div>
        <span className="rounded-full bg-black px-3 py-1.5 text-xs text-white">Evidence</span>
      </div>
      <div className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
        {rows.map(([amount, order, status, score, confidence, tone]) => (
          <div key={order} className="flex items-center gap-3 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100">
              <QrCode className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-technical text-xs font-medium">{amount}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{order}</p>
              <p className="mt-1.5 text-[11px] text-zinc-500">
                Risiko {score}/100 · Keyakinan {confidence}%
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{status}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl bg-[#c1fbd4] p-4">
        <div className="flex gap-3">
          <BrainCircuit className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Analisis yang dapat dijelaskan</p>
            <p className="mt-1 text-sm leading-5 text-zinc-700">
              Skor menunjukkan tingkat risiko. Keyakinan menunjukkan konsistensi
              sinyal yang membentuk keputusan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
