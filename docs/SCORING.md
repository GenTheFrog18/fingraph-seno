# QRIS Fraud Scoring

Rule output berisi `code`, alasan Bahasa Indonesia, contribution, severity, dan action. Critical rules: callback hilang, status bukan success tetapi diklaim lunas, amount mismatch, duplicate reference, merchant/outlet/QR mismatch, replay, serta reversal sesudah order diproses. Medium rules: delayed callback, repeated failures, dan rapid micro transactions.

Feature QRIS mencakup amount/expected/difference/ratio, hour/delay, velocity 10m, failures 30m, riwayat payer, merchant average/deviation, new payer, duplicate, cross-region/border, merchant/outlet risk, QR match, order age, dan velocity.

```text
weighted = rule*0.35 + tabular*0.30 + graph*0.25 + adaptive*0.10
final = clamp(max(critical_floor, weighted), 0, 1)
```

Floor medium 0.50, high 0.75, critical 0.90. Threshold klasifikasi low `<0.40`, medium `<0.70`, high `>=0.70`. Artifact hilang tidak error: score nullable dan `models_used` menjelaskan fallback. Cross-region sendiri tidak pernah memberi floor high.

Rekomendasi: `APPROVE`, `VERIFY`, `HOLD`, `DO_NOT_RELEASE_GOODS`, atau `REPORT_AND_HOLD`. Graph heuristic menghitung degree, connected merchant/alert, fraud-neighbor ratio, serta cluster risk. GraphSAGE Elliptic adalah bukti arsitektur prototype, bukan model QRIS production.

## Skor keyakinan analisis

Response scoring menyertakan `confidence_score` dalam rentang `0–1`. Nilai ini
mengukur konsistensi antar-sinyal yang tersedia (rule, graph, tabular, dan
adaptive), bukan probabilitas terkalibrasi bahwa transaksi pasti fraud atau
pasti aman. Semakin kecil sebaran antar-sinyal, semakin tinggi keyakinannya.
Rule berseverity medium/high/critical juga memberi batas keyakinan minimum
karena keputusan tersebut ditopang guard deterministik.

`analysis_mode` menjelaskan jalur yang benar-benar dipakai:

- `ensemble_ai`: sedikitnya artifact tabular atau adaptive tersedia.
- `rule_graph_fallback`: artifact model tidak tersedia; aplikasi tetap berjalan
  memakai rule guard dan graph heuristic tanpa mengklaim model AI aktif.

Frontend selalu menampilkan skor risiko, keyakinan, mode analisis, dan alasan
utama pada detail pembayaran. Nilai keyakinan tidak boleh dipakai sebagai
jaminan dan keputusan akhir tetap berada pada merchant/analyst.

## Prioritas operasional

Hasil risiko juga disalin ke field operasional `priority` agar daftar tindakan mempunyai prioritas eksplisit:

| Risk level | Priority |
|---|---|
| `low` | `rendah` |
| `medium` | `sedang` |
| `high` | `tinggi` |

Field ini tidak menambah kontribusi scoring dan tidak mengubah `final_score`; ia adalah representasi tersimpan untuk filter, agregasi, dan action log. Migration mengisi data lama memakai mapping yang sama, sementara setiap rescore menyinkronkannya kembali.
