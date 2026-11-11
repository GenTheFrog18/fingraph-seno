"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { Activity, ArrowRight, Bell, Check, ChevronRight, CircleHelp, Eye, Fingerprint, GitBranch, LayoutDashboard, LockKeyhole, LogOut, Mail, Network, RefreshCw, Search, Shield, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { getToken, login, type User } from "@/lib/auth";
import { useApi } from "@/hooks/use-api";
import type { NetworkCaseDetail, NetworkCaseGraph, NetworkCaseObservation, NetworkCaseSummary } from "@/lib/types";
import "./preview.css";

cytoscape.use(coseBilkent);

type Variant = "classic" | "glass";
type Tab = "overview" | "observations" | "graph" | "alerts";
type Screen = "landing" | "login" | "workspace";
type CaseList = { items: NetworkCaseSummary[] };

const money = (amount: number) => `Rp${amount.toLocaleString("id-ID")}`;
const date = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
const statusText = (value: string) => value === "suspected" ? "Perlu ditinjau" : value === "under_review" ? "Dalam investigasi" : "Ditutup";

export function InvestigationPreview({ variant }: { variant: Variant }) {
  const [screen, setScreen] = useState<Screen>("landing");
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) { setChecking(false); return; }
    void apiFetch<User>("/auth/me").then((current) => {
      setUser(current);
      setScreen("workspace");
    }).catch(() => {}).finally(() => setChecking(false));
  }, []);

  function signedIn(current: User) {
    setUser(current);
    setScreen("workspace");
  }

  const other = variant === "classic" ? "glass" : "classic";
  return (
    <div className={`fg-preview fg-${variant}`}>
      <div className="fg-variant-bar" aria-label="Pilihan desain">
        <span>UI EXPERIMENT</span>
        <Link href="/ui-preview/classic" aria-current={variant === "classic" ? "page" : undefined}>FinGraph</Link>
        <Link href="/ui-preview/glass" aria-current={variant === "glass" ? "page" : undefined}>Glass</Link>
        <span className="fg-variant-caption">Dua tampilan · sistem yang sama</span>
      </div>
      {checking ? <div className="fg-loading">Menyiapkan FinGraph…</div> : screen === "landing" ? (
        <Landing variant={variant} onLogin={() => setScreen("login")} />
      ) : screen === "login" ? (
        <Login onBack={() => setScreen("landing")} onSuccess={signedIn} />
      ) : user ? (
        <Workspace key={user.id} user={user} variant={variant} onExit={() => {
          localStorage.removeItem("fingraph_token");
          localStorage.removeItem("fingraph_user");
          setUser(null);
          setScreen("landing");
        }} />
      ) : null}
      <Link className="fg-switch-mobile" href={`/ui-preview/${other}`}>Lihat versi {other === "classic" ? "FinGraph" : "Glass"} <ArrowRight size={14} /></Link>
    </div>
  );
}

function Brand() {
  return <span className="fg-brand"><span className="fg-brand-mark"><Network size={20} strokeWidth={2.5} /></span><span>FinGraph<small>QRIS INTELLIGENCE</small></span></span>;
}

function Landing({ variant, onLogin }: { variant: Variant; onLogin: () => void }) {
  return <>
    <header className="fg-public-nav"><Brand /><nav aria-label="Navigasi utama"><a href="#features">Fitur</a><a href="#about">About</a><a href="#contact">Contact</a></nav><button className="fg-button fg-button-primary" onClick={onLogin}>Login <ArrowRight size={16} /></button></header>
    <main>
      <section className="fg-hero">
        <div className="fg-hero-copy"><span className="fg-eyebrow"><span className="fg-live-dot" /> INTELLIGENCE UNTUK QRIS LINTAS PSP</span><h1>One payment looks ordinary.<br /><em>The network tells more.</em></h1><p>FinGraph menghubungkan observasi pembayaran QRIS lintas penyedia, lalu mengubah pola jaringan menjadi kasus yang dapat diperiksa investigator.</p><div className="fg-hero-actions"><button className="fg-button fg-button-primary" onClick={onLogin}>Buka ruang investigasi <ArrowRight size={18} /></button><a href="#features" className="fg-button fg-button-secondary">Jelajahi fitur <ChevronRight size={16} /></a></div><span className="fg-fineprint">Analisis setelah transaksi · keputusan akhir oleh investigator · data demo sintetis</span></div>
        <div className="fg-hero-visual" aria-label="Ilustrasi tiga PSP menghubungkan sinyal ke satu kasus"><div className="fg-visual-top"><span>NETWORK SIGNAL / 001</span><span className="fg-visual-active">● INVESTIGATION READY</span></div><div className="fg-network"><div className="fg-network-line line-a" /><div className="fg-network-line line-b" /><div className="fg-network-line line-c" /><span className="fg-network-node fg-node-a">PSP A<small>Merchant 01</small></span><span className="fg-network-node fg-node-b">PSP B<small>Merchant 02</small></span><span className="fg-network-node fg-node-c">PSP C<small>Merchant 03</small></span><span className="fg-network-center"><ShieldAlert size={26} /><b>NETWORK<br />CASE</b></span></div><div className="fg-visual-bottom"><span>3 PSP TERHUBUNG</span><span>HUMAN REVIEW REQUIRED</span></div></div>
      </section>
      <section className="fg-feature-section" id="features"><div className="fg-section-heading"><span className="fg-eyebrow">FITUR PRODUK</span><h2>Dari event hingga evidence.</h2><p>Dirancang untuk mendukung analisis institusional tanpa membuka identitas payer mentah.</p></div><div className="fg-feature-grid">{[
        { icon: Fingerprint, title: "Signed ingestion", desc: "Event QRIS dari PSP diverifikasi dengan HMAC dan dicatat secara idempotent." },
        { icon: GitBranch, title: "Graph intelligence", desc: "Hubungan merchant, pembayaran, dan payer-link dibentuk lintas PSP." },
        { icon: Sparkles, title: "GNN prioritization", desc: "GraphSAGE membantu mengurutkan kasus; sinyal heuristik tetap terlihat." },
        { icon: Eye, title: "Evidence & audit", desc: "Investigator meninjau alasan relasi, provenance model, serta status kasus." },
      ].map(({ icon: Icon, title, desc }, index) => <article className="fg-feature-card" key={title}><span className="fg-feature-number">0{index + 1}</span><Icon size={25} strokeWidth={1.7} /><h3>{title}</h3><p>{desc}</p></article>)}</div></section>
      <section className="fg-about" id="about"><div><span className="fg-eyebrow">ABOUT FINGRAPH</span><h2>Perspektif lebih luas untuk investigasi yang lebih tepat.</h2></div><div><p>Setiap PSP memahami transaksi di lingkungannya. FinGraph membantu investigator yang berwenang melihat hubungan merchant dan payer-link yang melintasi batas acquirer melalui evidence graph.</p><p>Skor yang ditampilkan adalah prioritas investigasi, bukan probabilitas kejahatan atau keputusan memblokir pembayaran.</p><span className="fg-about-tag"><Shield size={16} /> Privasi payer terjaga melalui alias HMAC per kasus</span></div></section>
      <section className="fg-contact" id="contact"><div><span className="fg-eyebrow">CONTACT</span><h2>Bangun visibilitas jaringan bersama.</h2><p>Untuk kerja sama, integrasi, atau demonstrasi produk, hubungi tim FinGraph melalui repositori proyek.</p></div><a className="fg-button fg-button-primary" href="https://github.com/GenTheFrog18/fingraph-seno" target="_blank" rel="noreferrer">Hubungi tim <Mail size={17} /></a></section>
    </main><footer className="fg-footer"><Brand /><span>© 2026 FinGraph · {variant === "glass" ? "Glass concept" : "Core concept"} · Demo menggunakan data sintetis</span></footer>
  </>;
}

function Login({ onBack, onSuccess }: { onBack: () => void; onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setError("");
    try { const result = await login(email, password); onSuccess(result.user); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Login gagal"); }
    finally { setPending(false); }
  }
  return <div className="fg-login-wrap"><header><button className="fg-back" onClick={onBack}><ArrowRight size={17} /> Kembali</button><Brand /></header><div className="fg-login-grid"><div className="fg-login-aside"><span className="fg-eyebrow"><span className="fg-live-dot" /> SECURE INVESTIGATION</span><h1>Satu akses.<br /><em>Dua ruang kerja.</em></h1><p>Gunakan kredensial yang diberikan. Akun investigator membuka analisis jaringan; akun demo membuka area simulasi.</p><div className="fg-login-quote"><LockKeyhole size={23} /><span>Akses kasus diverifikasi kembali oleh server untuk investigator yang berwenang.</span></div></div><section className="fg-login-card"><div className="fg-card-icon"><Shield size={24} /></div><h2>Masuk ke FinGraph</h2><p>Masukkan email dan password akun Anda.</p><form onSubmit={submit}><label htmlFor="fg-email">Email</label><input id="fg-email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="nama@institusi.id" /><label htmlFor="fg-password">Password</label><input id="fg-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Masukkan password" />{error && <p className="fg-form-error" role="alert">{error}</p>}<button className="fg-button fg-button-primary" type="submit" disabled={pending}>{pending ? "Memverifikasi…" : "Masuk ke dashboard"} <ArrowRight size={18} /></button></form></section></div></div>;
}

function Workspace({ user, variant, onExit }: { user: User; variant: Variant; onExit: () => void }) {
  const investigator = user.role === "analyst" || user.role === "admin";
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [statusPending, setStatusPending] = useState(false);
  const cases = useApi<CaseList>(investigator ? "/cases?limit=100" : null);
  const selectedCaseId = selectedId ?? cases.data?.items[0]?.id ?? null;
  const detail = useApi<NetworkCaseDetail>(investigator && selectedCaseId ? `/cases/${selectedCaseId}` : null);
  const graph = useApi<NetworkCaseGraph>(investigator && selectedCaseId && tab === "graph" ? `/cases/${selectedCaseId}/graph` : null);
  const items = cases.data?.items ?? [];
  const visible = items.filter(item => `${item.case_type} ${item.participants.providers?.join(" ") ?? ""}`.toLowerCase().includes(filter.toLowerCase()));
  const observations = detail.data?.observations ?? [];
  const active = items.filter(item => item.status !== "dismissed");
  const providers = new Set(items.flatMap(item => item.participants.providers ?? []));

  async function changeStatus(status: "under_review" | "dismissed") {
    if (!selectedCaseId) return;
    setStatusPending(true);
    try {
      await apiFetch(`/cases/${selectedCaseId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await Promise.all([cases.reload(), detail.reload()]);
      toast.success("Status kasus diperbarui dan dicatat dalam audit");
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Status belum dapat diperbarui"); }
    finally { setStatusPending(false); }
  }

  const nav: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "observations", label: "Log transaksi", icon: Activity },
    { key: "graph", label: "Evidence graph", icon: Network },
    { key: "alerts", label: "Alerts & cases", icon: Bell },
  ];

  return <div className="fg-workspace"><aside className="fg-sidebar"><Brand /><div className="fg-sidebar-group"><small>WORKSPACE</small>{investigator ? nav.map(({ key, label, icon: Icon }) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}><Icon size={18} />{label}{key === "alerts" && active.length > 0 && <b>{active.length}</b>}</button>) : <button className="active"><Wallet size={18} />Demo pembayaran</button>}</div><div className="fg-sidebar-bottom"><div className="fg-side-note"><Shield size={18} /><span>{investigator ? "Investigasi post-event. Keputusan tetap oleh manusia." : "Simulasi pembayaran sedang disiapkan."}</span></div><button onClick={onExit}><LogOut size={17} /> Keluar</button></div></aside><div className="fg-workspace-main"><header className="fg-topbar"><div><span className="fg-breadcrumb">FIN GRAPH <ChevronRight size={12} /> {investigator ? "INVESTIGATION CENTER" : "DEMO STUDIO"}</span><h1>{investigator ? "Fraud intelligence" : "Demo pembayaran"}</h1></div><div className="fg-top-actions"><span className="fg-mode-pill"><span className="fg-live-dot" />{investigator ? "INVESTIGATOR" : "DEMO"}</span><span className="fg-avatar" title={user.email}>{user.full_name?.charAt(0) ?? "U"}</span><button className="fg-mobile-exit" onClick={onExit} aria-label="Keluar"><LogOut size={17} /></button></div></header><main className="fg-dashboard">
    {investigator ? <>
      <div className="fg-title-row"><div><span className="fg-eyebrow">QRIS / CROSS-PSP INTELLIGENCE</span><h2>{tab === "overview" ? "Network overview" : tab === "observations" ? "Log observasi kasus" : tab === "graph" ? "Evidence graph" : "Alerts & cases"}</h2><p>{tab === "observations" ? "Observasi yang terhubung dengan kasus terpilih. Ini bukan log seluruh event PSP." : "Pantau sinyal lintas PSP dan telusuri evidence dalam satu ruang investigasi."}</p></div><button className="fg-button fg-button-secondary" onClick={() => { void cases.reload(); void detail.reload(); if (tab === "graph") void graph.reload(); }}><RefreshCw size={15} /> Segarkan</button></div>
      {cases.error && <div className="fg-error" role="alert">{cases.error}. Akses kasus memerlukan akun investigator dalam allowlist sentral.</div>}
      <div className="fg-stat-grid"><Stat label="Kasus aktif" value={String(active.length)} hint="Perlu perhatian" tone="alert" icon={ShieldAlert} /><Stat label="PSP terhubung" value={String(providers.size)} hint="Dalam kasus terdaftar" icon={Network} /><Stat label="Total kasus" value={String(items.length)} hint="Tersimpan di sistem" icon={GitBranch} /><Stat label="Mode analisis" value="Post-event" hint="Human review" icon={Eye} /></div>
      {tab === "overview" && <div className="fg-dashboard-grid"><section className="fg-panel fg-primary-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">CASE QUEUE</span><h3>Kasus jaringan</h3></div><button onClick={() => setTab("alerts")}>Lihat semua <ArrowRight size={15} /></button></div><CaseRows items={visible.slice(0, 5)} selectedId={selectedCaseId} onSelect={setSelectedId} loading={cases.loading} /></section><section className="fg-panel fg-detail-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">CURRENT INVESTIGATION</span><h3>Ringkasan evidence</h3></div><Network size={19} /></div><CaseSummary detail={detail.data} loading={detail.loading} onGraph={() => setTab("graph")} /></section></div>}
      {tab === "observations" && <section className="fg-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">CASE-LINKED OBSERVATIONS</span><h3>Transaksi terkait kasus</h3></div><CaseSelect items={items} selectedId={selectedCaseId} onSelect={setSelectedId} /></div><Observations rows={observations} loading={detail.loading} /></section>}
      {tab === "graph" && <section className="fg-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">CONNECTED EVIDENCE</span><h3>Peta hubungan transaksi</h3></div><CaseSelect items={items} selectedId={selectedCaseId} onSelect={setSelectedId} /></div><div className="fg-graph-intro"><span><i className="fg-dot fg-dot-payment" /> Payment</span><span><i className="fg-dot fg-dot-merchant" /> Merchant</span><span><i className="fg-dot fg-dot-payer" /> Payer alias</span><small>Token payer mentah tidak ditampilkan</small></div>{graph.error ? <div className="fg-empty">{graph.error}</div> : graph.loading ? <div className="fg-empty">Memuat evidence graph…</div> : graph.data ? <CaseGraph graph={graph.data} variant={variant} /> : <div className="fg-empty">Pilih kasus untuk menampilkan graph.</div>}</section>}
      {tab === "alerts" && <div className="fg-dashboard-grid"><section className="fg-panel fg-primary-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">INVESTIGATION QUEUE</span><h3>Alert jaringan</h3></div><label className="fg-search"><Search size={16} /><input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Cari kasus atau PSP" aria-label="Cari kasus" /></label></div><CaseRows items={visible} selectedId={selectedCaseId} onSelect={setSelectedId} loading={cases.loading} /></section><section className="fg-panel fg-detail-panel"><div className="fg-panel-head"><div><span className="fg-eyebrow">REVIEW & DECISION</span><h3>Detail kasus</h3></div><Shield size={19} /></div><CaseSummary detail={detail.data} loading={detail.loading} onGraph={() => setTab("graph")} />{detail.data && <div className="fg-case-actions">{detail.data.status === "suspected" && <button disabled={statusPending} className="fg-button fg-button-primary" onClick={() => void changeStatus("under_review")}>Mulai investigasi <ArrowRight size={16} /></button>}{detail.data.status !== "dismissed" && <button disabled={statusPending} className="fg-button fg-button-secondary" onClick={() => void changeStatus("dismissed")}>Tandai selesai <Check size={16} /></button>}</div>}<p className="fg-audit-note"><CircleHelp size={15} /> Perubahan status tercatat dalam audit backend.</p></section></div>}
    </> : <DemoPlaceholder />}
  </main></div></div>;
}

function Stat({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint: string; icon: typeof Network; tone?: string }) {
  return <div className={`fg-stat ${tone ?? ""}`}><div className="fg-stat-top"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{hint}</small></div>;
}

function CaseRows({ items, selectedId, onSelect, loading }: { items: NetworkCaseSummary[]; selectedId: string | null; onSelect: (id: string) => void; loading: boolean }) {
  if (loading) return <div className="fg-empty">Memuat kasus…</div>;
  if (!items.length) return <div className="fg-empty">Belum ada kasus pada daftar ini.</div>;
  return <div className="fg-case-list">{items.map(item => <button key={item.id} className={selectedId === item.id ? "selected" : ""} onClick={() => onSelect(item.id)}><span className="fg-case-icon"><ShieldAlert size={18} /></span><span className="fg-case-main"><b>{item.case_type.replaceAll("_", " ")}</b><small>{item.participants.providers?.join(" · ") ?? "Provider belum tersedia"} · {date(item.updated_at)}</small></span><span className="fg-case-right"><span className={`fg-status ${item.status}`}>{statusText(item.status)}</span><strong>{Math.round(item.risk_score * 100)}<small>/100</small></strong></span></button>)}</div>;
}

function CaseSelect({ items, selectedId, onSelect }: { items: NetworkCaseSummary[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <select className="fg-select" aria-label="Pilih kasus" value={selectedId ?? ""} onChange={event => onSelect(event.target.value)}>{items.length === 0 && <option value="">Belum ada kasus</option>}{items.map(item => <option key={item.id} value={item.id}>{item.case_type.replaceAll("_", " ")} · {item.id.slice(0, 8)}</option>)}</select>;
}

function CaseSummary({ detail, loading, onGraph }: { detail: NetworkCaseDetail | null; loading: boolean; onGraph: () => void }) {
  if (loading) return <div className="fg-empty">Memuat evidence…</div>;
  if (!detail) return <div className="fg-empty">Pilih kasus untuk melihat ringkasan.</div>;
  const provenance = detail.model_provenance?.gnn;
  return <div className="fg-summary"><span className={`fg-status ${detail.status}`}>{statusText(detail.status)}</span><h4>{detail.case_type.replaceAll("_", " ")}</h4><p>Prioritas investigasi <b>{Math.round(detail.risk_score * 100)}/100</b>. Skor bukan probabilitas kejahatan.</p><div className="fg-summary-metrics"><div><strong>{detail.participants.providers?.length ?? 0}</strong><small>PSP</small></div><div><strong>{detail.participants.merchants?.length ?? 0}</strong><small>Merchant</small></div><div><strong>{detail.payer_link_count}</strong><small>Payer links</small></div></div><div className="fg-model"><Sparkles size={18} /><span><b>Model provenance</b><small>{provenance && typeof provenance === "object" ? "GNN artifact tercatat" : "Heuristic fallback / belum tersedia"}</small></span></div><button className="fg-text-action" onClick={onGraph}>Buka evidence graph <ArrowRight size={16} /></button></div>;
}

function Observations({ rows, loading }: { rows: NetworkCaseObservation[]; loading: boolean }) {
  if (loading) return <div className="fg-empty">Memuat observasi…</div>;
  if (!rows.length) return <div className="fg-empty">Belum ada observasi terkait kasus.</div>;
  return <div className="fg-table-scroll"><table><thead><tr><th>Waktu</th><th>PSP</th><th>Merchant</th><th>Nominal</th><th>Skor GNN</th><th>Sinyal</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{date(row.occurred_at)}</td><td><span className="fg-provider">{row.source_provider_id}</span></td><td>{row.merchant_ref}</td><td>{money(row.amount_idr)}</td><td>{row.gnn_score == null ? "Fallback" : `${Math.round(row.gnn_score * 100)}/100`}</td><td>{row.scoring_status === "complete" ? <span className="fg-signal-good">● Model aktif</span> : <span className="fg-signal-warn">● Heuristic</span>}</td></tr>)}</tbody></table></div>;
}

function CaseGraph({ graph, variant }: { graph: NetworkCaseGraph; variant: Variant }) {
  const container = useRef<HTMLDivElement>(null);
  const cy = useRef<Core | null>(null);
  const [selected, setSelected] = useState<{ label: string; reason?: string; provider?: string } | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const elements: ElementDefinition[] = [...graph.nodes.map(node => ({ data: node, classes: node.entity_type ?? "payment" })), ...graph.edges.map(edge => ({ data: edge }))];
    const instance = cytoscape({ container: container.current, elements, minZoom: 0.35, maxZoom: 3, style: [
      { selector: "node", style: { label: "data(label)", "font-size": 11, "font-weight": 600, color: variant === "glass" ? "#e6f3ef" : "#18312e", "text-wrap": "wrap", "text-max-width": 96, "text-valign": "bottom", "text-margin-y": 9, "background-color": "#4d9fd4", width: 30, height: 30, "border-width": 2, "border-color": "#ffffff" } },
      { selector: "node.merchant", style: { "background-color": "#32b48b", shape: "round-rectangle", width: 38, height: 38 } },
      { selector: "node.payer_link", style: { "background-color": "#a992f0", shape: "diamond", width: 38, height: 38 } },
      { selector: "node:selected", style: { "border-width": 4, "border-color": "#f8b45e" } },
      { selector: "edge", style: { width: 2, "line-color": variant === "glass" ? "#6c8b87" : "#afc9c2", "target-arrow-color": variant === "glass" ? "#6c8b87" : "#afc9c2", "target-arrow-shape": "triangle", "curve-style": "bezier" } },
    ] as cytoscape.StylesheetStyle[], layout: { name: "cose-bilkent", animate: false, fit: true, padding: 64 } as cytoscape.LayoutOptions });
    instance.on("tap", "node", event => setSelected(event.target.data()));
    cy.current = instance;
    return () => { instance.destroy(); cy.current = null; };
  }, [graph, variant]);
  return <div className="fg-graph-wrap"><div className="fg-graph-toolbar"><span>{graph.nodes.length} node · {graph.edges.length} relasi</span><div><button onClick={() => cy.current?.zoom(Math.min((cy.current?.zoom() ?? 1) * 1.25, 3))} aria-label="Perbesar graph">＋</button><button onClick={() => cy.current?.zoom(Math.max((cy.current?.zoom() ?? 1) / 1.25, 0.35))} aria-label="Perkecil graph">－</button><button onClick={() => cy.current?.fit(undefined, 64)} aria-label="Sesuaikan graph">◎</button></div></div><div ref={container} className="fg-graph-canvas" aria-label="Evidence graph kasus" /><div className="fg-graph-footer">{selected ? <span><b>{selected.label}</b> · {selected.reason ?? selected.provider ?? "Node evidence"}</span> : <span>Klik node untuk melihat alasan hubungan.</span>}{graph.truncated && <span>Pratinjau {graph.returned_observations} dari {graph.total_observations} observasi</span>}</div></div>;
}

function DemoPlaceholder() {
  return <div className="fg-demo"><div className="fg-demo-emblem"><Wallet size={36} /></div><span className="fg-eyebrow">DEMO WORKSPACE</span><h2>Simulasi pembayaran segera hadir.</h2><p>Area ini disiapkan untuk memperagakan pembayaran QRIS normal dan pola fraud. Skenario dan tombol eksekusi akan dihubungkan setelah simulator demo selesai dibuat.</p><div className="fg-demo-cards"><div><Check size={22} /><b>Pembayaran normal</b><small>Placeholder alur yang terverifikasi</small><span>COMING SOON</span></div><div><ShieldAlert size={22} /><b>Pola mencurigakan</b><small>Placeholder alur investigasi fraud</small><span>COMING SOON</span></div></div><small>Mode demo menggunakan data sintetis. Tidak ada transaksi nyata yang dijalankan di halaman ini.</small></div>;
}
