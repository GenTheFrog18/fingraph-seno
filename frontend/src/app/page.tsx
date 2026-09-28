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
import { PricingCards } from "@/components/product/pricing";
import { PublicTrustMetrics } from "@/components/product/public-trust-metrics";
import { Button } from "@/components/ui/button";

const problems = [
  {
    icon: FileWarning,
    number: "01",
    title: "Bukti pembayaran bisa dipalsukan.",
    body: "Screenshot bukan konfirmasi dana. FinGraph membantu kasir kembali ke data transaksi yang benar-benar diterima.",
  },
  {
    icon: ReceiptText,
    number: "02",
    title: "Dana masuk, tetapi nominalnya kurang.",
    body: "Nilai pembayaran dibandingkan dengan pesanan agar selisih tidak terlewat saat antrean sedang ramai.",
  },
  {
    icon: RotateCcw,
    number: "03",
    title: "QRIS dapat mengarah ke outlet yang salah.",
    body: "Profil merchant, outlet, dan sidik QR dibandingkan sebelum pesanan diserahkan.",
  },
];

const features = [
  ["Verifikasi pembayaran", "Keputusan dan tindakan ditampilkan sebelum rincian teknis."],
  ["Peringatan yang jelas", "Alasan singkat untuk memproses, memeriksa, atau menahan pesanan."],
  ["Hubungan transaksi", "Tim investigasi dapat menelusuri pola lintas akun dan outlet."],
  ["Laporan usaha", "Ringkasan pembayaran, risiko, dan action log dalam satu alur."],
];

const steps = [
  {
    number: "01",
    icon: ReceiptText,
    title: "Pembayaran diterima",
    body: "Referensi, nominal, dan pesanan masuk ke ruang pemeriksaan.",
  },
  {
    number: "02",
    icon: ScanSearch,
    title: "FinGraph menganalisis",
    body: "Konfirmasi, profil QRIS, dan sinyal risiko diperiksa bersama.",
  },
  {
    number: "03",
    icon: CircleCheckBig,
    title: "Merchant bertindak",
    body: "Proses, periksa, tahan, atau laporkan dengan alasan yang jelas.",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-fixed-theme min-h-screen overflow-x-clip bg-black text-white">
      <PublicHeader />

      <section className="bg-black">
        <Reveal className="mx-auto max-w-[1440px] px-4 pb-12 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:px-10 lg:pt-32">
          <p className="text-xs font-normal tracking-[.08em] text-zinc-400">
            KEAMANAN PEMBAYARAN UNTUK UMKM
          </p>
          <div className="mt-7 grid gap-8 lg:grid-cols-[1.25fr_.55fr] lg:items-end">
            <h1 className="font-display max-w-[1040px] text-[46px] font-light leading-[.98] tracking-[-.035em] sm:text-[66px] lg:text-[88px]">
              Pastikan pembayaran masuk sebelum pesanan diserahkan.
            </h1>
            <div className="pb-2">
              <p className="text-base font-normal leading-7 text-zinc-300 lg:text-lg">
                Cocokkan konfirmasi dan nominal QRIS, lalu ambil tindakan yang
                tepat tanpa menebak-nebak.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-7 h-12 border-2 border-white bg-white px-6 text-black hover:bg-zinc-200"
              >
                <Link href="/login">
                  Coba FinGraph
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <p className="mt-5 text-xs leading-5 text-zinc-400">
                Mode Demo memakai simulator. Tidak terhubung ke Bank Indonesia,
                bank, atau PJP nyata.
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
              alt="Pemilik usaha memeriksa pembayaran di meja kasir sebelum menyerahkan pesanan"
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

      <section id="untuk-umkm" className="bg-black py-20 sm:py-28">
        <Reveal className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="max-w-4xl">
            <p className="text-xs tracking-[.08em] text-zinc-500">MASALAH DI KASIR</p>
            <h2 className="font-display mt-6 text-[42px] font-light leading-[1.08] tracking-[-.03em] sm:text-[62px]">
              Bukti terlihat benar. Dana belum tentu masuk.
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
              RUANG KERJA MERCHANT
            </span>
            <h2 className="font-display mt-6 text-[42px] font-light leading-[1.08] tracking-[-.03em] sm:text-[55px]">
              Informasi penting muncul pada saat yang tepat.
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

      <section id="harga" className="bg-[#fbfbf5] py-20 text-black sm:py-28">
        <Reveal className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[.08em] text-zinc-500">PAKET FINGRAPH</p>
            <h2 className="font-display mt-6 text-[44px] font-light leading-[1.08] tracking-[-.03em] sm:text-[58px]">
              Mulai kecil. Tambah perlindungan saat usaha tumbuh.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600">
              Harga katalog MVP dalam Rupiah per bulan. Pemilihan paket pada
              Mode Demo tidak memproses pembayaran.
            </p>
          </div>
          <div className="mt-12">
            <PricingCards />
          </div>
        </Reveal>
      </section>

      <section className="bg-[#d4f9e0] py-14 text-black">
        <Reveal className="mx-auto grid max-w-[1240px] gap-8 px-4 sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex gap-4">
            <EyeOff className="mt-1 h-6 w-6 shrink-0" />
            <div>
              <h2 className="text-xl font-medium">Privasi ikut dirancang dari awal.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700">
                Identitas pembayar dipseudonimkan. Prototype Federated Learning
                tidak membagikan baris transaksi mentah antar-node.
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
            Pembayaran jelas. Usaha lebih tenang.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
            Satu ruang kerja untuk memeriksa pembayaran, memahami risiko, dan
            menentukan tindakan sebelum pesanan diserahkan.
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
              FinGraph membantu UMKM memeriksa pembayaran, memahami risiko,
              dan mengambil tindakan sebelum pesanan diserahkan.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-zinc-400">
            <a href="#cara-kerja">Cara kerja</a>
            <a href="#untuk-umkm">Untuk UMKM</a>
            <a href="#fitur">Fitur</a>
            <a href="#harga">Harga</a>
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
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-black/95 text-white backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <AppLogo inverted />
        <nav className="hidden items-center gap-8 text-[15px] text-zinc-300 md:flex" aria-label="Navigasi utama">
          <a href="#cara-kerja" className="hover:text-white">Cara kerja</a>
          <a href="#untuk-umkm" className="hover:text-white">Untuk UMKM</a>
          <a href="#fitur" className="hover:text-white">Fitur</a>
          <a href="#harga" className="hover:text-white">Harga</a>
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
          <div className="absolute right-0 top-14 w-64 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-2 shadow-2xl">
            {[
              ["#cara-kerja", "Cara kerja"],
              ["#untuk-umkm", "Untuk UMKM"],
              ["#fitur", "Fitur"],
              ["#harga", "Harga"],
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
    ["Rp350.000", "Pesanan katering", "Terverifikasi", "12", "96", "text-[#137a3e] bg-[#e8f8ed]"],
    ["Rp150.000", "Paket batik", "Perlu diperiksa", "58", "84", "text-[#8a5600] bg-[#fff3d6]"],
    ["Rp2.400.000", "Pembelian grosir", "Berisiko", "91", "95", "text-[#b42318] bg-[#fce8e8]"],
  ];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-[0_8px_8px_rgba(0,0,0,.08),0_4px_4px_rgba(0,0,0,.08),0_2px_2px_rgba(0,0,0,.08),0_0_0_1px_rgba(0,0,0,.06)] sm:p-5">
      <div className="flex items-center justify-between px-2 py-3">
        <div>
          <p className="font-medium">Pembayaran terbaru</p>
          <p className="mt-1 text-xs text-zinc-500">Warung Sari · Pasar Gede</p>
        </div>
        <span className="rounded-full bg-black px-3 py-1.5 text-xs text-white">Lihat semua</span>
      </div>
      <div className="mt-2 divide-y divide-zinc-200 border-y border-zinc-200">
        {rows.map(([amount, order, status, score, confidence, tone]) => (
          <div key={order} className="flex items-center gap-3 py-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-zinc-100">
              <QrCode className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{amount}</p>
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
