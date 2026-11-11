# FinGraph UI findings and stack recommendation

Date: 11 November 2026. Scope: frontend investigation and two UI previews for the QRIS cross-PSP product.

## Decision

Keep the current Next.js 16, React 19, TypeScript, Tailwind CSS 4, Cytoscape and FastAPI stack. The two requested visual directions can share authentication, data contracts and investigator interactions. Glassmorphism is a CSS treatment, not a reason to replace the frontend framework. No new dependencies or backend architecture changes are needed for the previews.

## Evidence and current condition

| Finding | Evidence | UI consequence |
| --- | --- | --- |
| The current landing mixes the QRIS institutional pitch with merchant-era pricing and payment-check copy. | `frontend/src/app/page.tsx`, sections `harga` and `PaymentWorkspacePreview` | A focused landing should explain the cross-PSP investigator product, features, About, Contact and a top-right login action. |
| The login page has email/password, but also prefilled credentials and one-click Merchant/Analyst/Admin shortcuts in demo mode. | `frontend/src/app/login/page.tsx` | Preview login should present only email and password. The authenticated account determines the workspace. |
| The main `/dashboard` route can still render legacy merchant, analyst and admin home pages. | `frontend/src/app/dashboard/page.tsx`; `frontend/src/components/layout/product-shells.tsx` | Preview routes should not suggest legacy merchant analytics are the cross-PSP investigation console. |
| `/dashboard/graph` and `/dashboard/alerts` use older graph/payment contracts. | `frontend/src/app/dashboard/graph/page.tsx`; `frontend/src/app/dashboard/alerts/page.tsx` | QRIS preview graph and alerts should use the network-case API, not those legacy surfaces. |
| The current case screen already fetches cases, detail and a bounded Cytoscape graph. | `frontend/src/app/dashboard/cases/page.tsx`; `backend/app/api/psp_intelligence.py` | Reuse the actual case contract and graph library. The new UI can improve graph legibility and case triage. |
| Case access is restricted to analyst/admin accounts in a central email allowlist. | `backend/app/api/deps.py`; `backend/app/api/psp_intelligence.py` | A frontend role check is only navigation. The API remains the authorization boundary. |
| The running synthetic demo and browser case screenshot were reported as healthy in the Day 2 handoff, while the six-event verification is from the earlier stabilization return. | `handoffs/FinGraph_Day2_Main_Agent_Status_2026-11-11.md`; stabilization return bundled with the Day 2 packet | UI copy must label scores as investigation priority and the demo as synthetic, not claim production fraud performance. |

## Technical gaps observed, documented only

1. **No investigator-wide QRIS observation log endpoint.** The case detail API exposes observations attached to an investigation case. `/transactions` is a legacy account transaction API; `/payments` is a merchant payment API. The preview labels its log as *case-linked observations* and does not imply it includes every signed PSP event. A full ingestion log would require a dedicated authorized read-only endpoint, which is outside this UI task.
2. **No separate `demo` role.** The existing roles are `admin`, `analyst`, and `merchant` (`frontend/src/lib/auth.ts`, `backend/app/api/auth.py`). The preview maps the existing merchant demo account to the simulation placeholder; this is a presentation mapping, not a new server-side permission or simulator integration.
3. **The old case graph can be difficult to read at presentation scale.** The previous screenshot (`evidence/browser-cases.png` in the stabilization return) shows small labels and a dense network. The preview should provide a larger canvas, legend, selected-node detail and a visible graph truncation note.
4. **Old product claims remain in some pages and quick docs.** `frontend/src/app/page.tsx` still includes merchant pricing, and `docs/quick/SYSTEM_OVERVIEW.md` is identified as stale in the Day 2 packet. The preview uses the current product wording without changing the legacy pages or docs.

## Two UI directions

| Direction | Benefits | Tradeoff |
| --- | --- | --- |
| FinGraph current language: light, solid surfaces, dark text and green accent | Highest scanability for dense investigation tables; close to existing UI and fastest to integrate | Less visually distinctive on stage |
| Restrained glassmorphism: dark layered background, translucent shell and summary cards | Strong presentation identity while keeping the same workflows | Blur and transparency can reduce readability, so graph canvas, tables and forms remain opaque/high contrast |

Both variants use the same case list, case detail, case graph, audit action and login flow. They are isolated preview routes; choosing the production presentation route later does not require a framework migration.

## Review paths

- `/ui-preview/classic` — current FinGraph visual language.
- `/ui-preview/glass` — restrained glassmorphism.

The local source snapshot is under `ui-experiments/current-project-snapshot/`; experiment notes are under `ui-experiments/README.md`. The source snapshot stays local and is not a second production codebase.
