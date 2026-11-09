# Laporan Strategis Arsitektur MyRent
### Dari 4 Pilar Admin menuju Platform Transaksi yang End-to-End

**Tanggal:** 9 November 2026  
**Ruang lingkup:** Backend (`routes`, `controllers`, Prisma schema), frontend admin & transaksi, kesiapan operasional  
**Sifat:** Analisis read-only — tidak ada perubahan kode aplikasi  
**Status 4 pilar:** UI selesai, tetapi lapisan uang dan sengketa belum benar-benar end-to-end

---

## 0. Ringkasan Eksekutif

Empat pilar admin — **Verifikasi, Pencairan, Mediasi, Moderasi** — secara tampilan sudah dibangun. Namun setelah menelusuri route, schema, dan alur frontend, kesimpulannya:

> **Yang sudah jadi adalah "layar admin". Yang belum jadi adalah "sistem keuangannya".**

Tiga fakta yang paling menentukan prioritas sprint berikutnya:

1. **Pembayaran masih simulasi.** Checkout memanggil `PATCH /api/orders/:id/mock-pay`; QRIS hanya SVG dekoratif. Tidak ada `Payment` model, payment gateway, webhook, idempotency, refund, atau job kedaluwarsa.
2. **Mediasi admin membaca tabel yang tidak pernah diisi.** `DisputeTicket` tidak pernah dibuat oleh route mana pun. Order hanya diubah ke `status = 'DISPUTE'`, sehingga daftar mediasi admin kosong. Penyewa juga tidak punya endpoint untuk mengajukan sengketa atau membela diri.
3. **Ada empat rumus pembagian uang yang berbeda.** `complete-inspection` dan `orders/:id/resolve-dispute` membayar pemilik 100%; `admin/disputes/:id/resolve` memotong fee 5%; kalkulasi dompet pemilik memotong 5% lagi. Tidak ada ledger otoritatif — `walletBalance` dimutasi langsung.

Karena itu, urutan epic yang direkomendasikan **bukan** menambah layar admin baru, melainkan menyelesaikan tulang punggung transaksi:

| Prioritas | Epic | Alasan utama | Estimasi |
|---|---|---|---|
| **1** | **Payment, Escrow & Settlement Engine** | Semua fitur uang lain bergantung pada satu sumber kebenaran | 3–4 minggu |
| **2** | **Dispute & Claims Lifecycle 2.0** | Pilar Mediasi saat ini tidak berfungsi; butuh engine settlement dari Epic 1 | 2–3 minggu |
| **3** | **Booking, Availability & Inventory Integrity** | Mencegah double-booking dan inventaris terkunci selamanya | 2–3 minggu |

**Epic 4 — Admin Governance & Observability** (daftar pengguna, audit log viewer, financial overview, order monitor) adalah permukaan kosong terbesar di frontend, tetapi **bukan jalur kritis**. Kerjakan sebagai quick win paralel, bukan sebagai top-3.

Estimasi total: **8–10 minggu** untuk 2–3 engineer, dengan Sprint 0 untuk keputusan produk dan kontrak gateway.

---

## 1. Snapshot Sistem Saat Ini

### 1.1 Backend

- Express app dengan **12 router terpasang** di `backend/src/app.js` (health, auth, admin, rentals, equipments, categories, orders, reviews, chats, stats, wallet, notifications).
- **16 modul route** bila sub-router admin dihitung terpisah; sekitar **85 handler endpoint**.
- Prisma: **13 model, 9 enum**. Tidak ada model `Payment`, `PaymentEvent`, `LedgerEntry`, atau `DisputeEvidence`.
- Model yang sudah ada: `User`, `Equipment`, `Order`, `Review`, `Conversation`, `Message`, `WithdrawalAccount`, `WalletTransaction`, `Notification`, `TenantProfile`, `WithdrawalRequest`, `DisputeTicket`, `AdminAuditLog`.
- `Order` sudah memiliki `paymentDeadline`, `paidAt`, `paymentMethod`, `platformFeeRate`, `platformFee`, `netOwnerPayout` — **field-nya ada, tetapi belum dipakai konsisten oleh satu service pun.**

### 1.2 Kesiapan 4 Pilar

| Pilar | Backend | Frontend | End-to-End | Catatan |
|---|---|---|---|---|
| **Verifikasi / KYC** | ✅ lengkap | ✅ lengkap | 🟡 sebagian | Approve/reject/revision ada, tetapi status KYC tidak ditegakkan di middleware |
| **Pencairan / Withdrawal** | ✅ lengkap | ✅ lengkap | 🟡 sebagian | Saldo dipotong saat request, tetapi `WalletTransaction` sudah `BERHASIL` padahal `WithdrawalRequest` masih `MENUNGGU` |
| **Mediasi / Dispute** | 🟡 hanya baca + resolve | ✅ lengkap | 🔴 rusak | `DisputeTicket` tidak pernah dibuat; penyewa tidak bisa mengajukan/membela |
| **Moderasi** | ✅ lengkap | ✅ lengkap | 🟢 siap | Takedown/restore alat & hapus review sudah terhubung |

### 1.3 Permukaan Admin yang Masih Kosong

| Kebutuhan | Backend | Frontend | Status |
|---|---|---|---|
| Daftar semua pengguna | ❌ tidak ada `GET /api/admin/users` | `ManajemenPengguna.jsx` ada tetapi tidak diroute | Gap |
| Financial overview | ❌ tidak ada | `apiClient.js:17` memanggil endpoint yang tidak ada; `FinanceDashboard.jsx` masih mock | Gap |
| Order monitor | ❌ tidak ada endpoint admin order | `TransaksiAdmin.jsx` tidak diroute | Gap |
| Audit log viewer | 🟡 model terisi, tanpa endpoint baca | ❌ tidak ada | Gap |
| Pengaturan platform | ❌ tidak ada | `PengaturanAdmin.jsx` tidak diroute | Gap |
| Notifikasi penyewa | ✅ endpoint generik | ❌ tidak ada bell di navbar penyewa | Gap |

---

## 2. Gap Analysis

### 2.1 Temuan Kritis (P0) — Menyentuh Uang, Kepercayaan, dan Hukum

#### G-01. Pembayaran masih simulasi, bukan transaksi nyata

**Bukti:**
- `frontend/src/components/checkout/CheckoutStep3.jsx:2` — *"Pembayaran Escrow (Mock Payment)"*; QRIS dibuat sebagai SVG, bukan payload EMVCo.
- `backend/src/routes/orders.js:436` — `PATCH /api/orders/:id/mock-pay` langsung mengubah status ke `MENUNGGU_KONFIRMASI`.
- `backend/src/routes/wallet.js:588` — top-up saldo instan tanpa gateway.
- Schema tidak memiliki `Payment`, `PaymentEvent`, atau idempotency key.

**Dampak:** Tidak ada uang yang benar-benar masuk; tidak ada rekonsiliasi; tidak ada cara menangani pembayaran gagal, kedaluwarsa, refund, atau chargeback. Seluruh laporan finansial admin tidak bisa dipercaya.

**Selain itu:** `PATCH /api/orders/:id/reject` (`orders.js:599`) dan `PATCH /api/orders/:id/cancel` (`orders.js:644`) hanya mengubah status ke `DITOLAK` — **tidak mengembalikan saldo penyewa** yang sudah dipotong via pembayaran `WALLET` (`orders.js:481–500`). Ini adalah bug kebocoran dana langsung.

#### G-02. `DisputeTicket` adalah tabel yatim

**Bukti:**
- `backend/prisma/schema.prisma:466` mendefinisikan `DisputeTicket`.
- Satu-satunya operasi tulis adalah `tx.disputeTicket.update(...)` di `backend/src/routes/admin/adminDisputes.js:303`.
- **Tidak ada `disputeTicket.create` di seluruh backend.**
- `PATCH /api/orders/:id/dispute` (`orders.js:1131`) dan `complete-inspection` dengan `approveRefund=false` (`orders.js:1087`) hanya mengubah `Order.status = 'DISPUTE'`.
- Akibatnya `GET /api/admin/disputes` (`adminDisputes.js:67`) membaca tabel kosong.

**Dampak:** Pilar Mediasi secara fungsional tidak bisa dipakai. Admin tidak akan pernah melihat sengketa yang diajukan pemilik.

#### G-03. Penyewa tidak bisa mengajukan sengketa atau membela diri

**Bukti:**
- `PATCH /api/orders/:id/dispute` hanya mengizinkan `equipment.ownerId` atau `ADMIN` (`orders.js:1153`).
- `DisputeTicket` sudah punya `renterDefenseNote` dan `renterCounterPhotos` (`schema.prisma:475–476`), tetapi **tidak ada endpoint dan tidak ada UI** untuk mengisinya.
- Tidak ada endpoint `GET` sengketa dari sisi penyewa/pemilik.

**Dampak:** Sengketa bersifat satu arah. Penyewa tidak punya hak membela diri, yang secara operasional dan hukum lemah.

#### G-04. Empat rumus settlement yang saling bertentangan

| Jalur | File | Fee platform | Payout pemilik | Refund penyewa |
|---|---|---|---|---|
| `complete-inspection` | `orders.js:1045–1075` | **0%** | 100% rental + shipping + addons | 100% deposit |
| `orders/:id/resolve-dispute` | `orders.js:1237–1272` | **0%** | 100% rental + shipping + addons + damage | deposit − damage |
| `admin/disputes/:id/resolve` | `adminDisputes.js:288–291` | **5% dari rental** | net rental + shipping + addons + damage | deposit − damage |
| Kalkulasi dompet pemilik | `wallet.js` | **5%** dipotong terpisah | — | — |

**Dampak:** Nominal yang diterima pemilik bergantung pada endpoint mana yang dipanggil. Tidak ada definisi resmi "platform fee". Ini adalah sumber sengketa berikutnya dan membuat audit mustahil.

#### G-05. Tidak ada ledger; `walletBalance` adalah sumber kebenaran yang bisa drift

**Bukti:**
- Semua alur memakai `prisma.user.update({ data: { walletBalance: { increment/decrement } } })` langsung, tanpa entri ledger immutable.
- `wallet.js:383` membuat `WalletTransaction` dengan status `BERHASIL` saat **request** pencairan dibuat; `WithdrawalRequest` baru `MENUNGGU` (`wallet.js:398`).
- Admin approve (`adminFinance.js:103`) hanya mengubah status request; tidak ada posting ledger.
- Admin reject (`adminFinance.js:194`) mengembalikan saldo dengan increment langsung.

**Dampak:** Riwayat transaksi tidak dapat direkonsiliasi. Jika satu update gagal di tengah alur, saldo bisa tidak cocok dengan riwayat. Status `BERHASIL` sebelum approval juga menyesatkan UI dan laporan.

#### G-06. Ketersediaan alat bersifat dekoratif, bukan proteksi

**Bukti:**
- `Equipment.stock` ada (`schema.prisma:130`) dan `maintenanceBufferDays` ada (`schema.prisma:115`), tetapi `POST /api/orders` (`orders.js:329`) **tidak memeriksa overlap sama sekali**.
- `GET /api/equipments` menghitung `dayStatus` untuk kalender (`equipments.js:277`), tetapi nilai itu hanya informatif.
- `PATCH /api/orders/:id/extend` (`orders.js:765`) menambah `endDate` tanpa memeriksa booking berikutnya.
- `Order.paymentDeadline` diisi 24 jam (`orders.js:386`), tetapi **tidak ada job yang mengubah order kedaluwarsa**. Order `MENUNGGU_PEMBAYARAN` dapat mengunci alat selamanya.

**Dampak:** Double-booking mungkin terjadi; alat populer bisa "hilang" dari inventaris karena order tak dibayar; pemilik tidak bisa mengandalkan kalender.

---

### 2.2 Temuan Tinggi (P1) — Operasional, Keamanan, dan Skalabilitas

#### G-07. Governance admin belum ada

- Tidak ada `GET /api/admin/users`; `adminUsers.js` hanya punya `submissions` (KYC), suspend, dan unsuspend.
- `apiClient.js:17` sudah memanggil `/api/admin/financial/overview`, tetapi backend tidak punya route tersebut.
- `FinanceDashboard.jsx:66` masih memakai `mockMetrics`.
- `AdminAuditLog` ditulis di banyak aksi admin, tetapi tidak ada endpoint untuk membacanya.
- Tidak ada endpoint admin untuk memonitor seluruh order.

#### G-08. Hardening auth belum memadai

- OTP admin **hardcoded `123456`** (`auth.js:572`).
- Registrasi mengembalikan JWT tanpa gate KYC; `requireAuth` tidak memeriksa `verificationStatus` (tidak ditemukan pengecekan KYC di `backend/src/middleware`).
- CORS mengizinkan semua origin (`app.js:90–99`), meskipun `config.corsOrigins` sudah ada.
- JWT fallback secret hardcoded (`config.js:12`) dan expiry 7 hari tanpa refresh token (`config.js:13`).
- Body JSON 12 MB untuk mengakomodasi foto base64 (`app.js:102`).

#### G-09. Notifikasi hanya sepihak

- Endpoint `notifications.js` generik, tetapi penulisan notifikasi berpusat pada pemilik.
- `OwnerDashboard.jsx:392–398` melakukan polling 10 detik.
- Navbar penyewa tidak memiliki bell notifikasi.
- Admin tidak menerima notifikasi sengketa baru.

#### G-10. Dua shell admin dan banyak file mati

- `frontend/src/App.jsx:450` memakai `/portal-internal-hq/*`.
- `frontend/src/App.jsx:506` memakai `/admin/*` dengan `AdminLayout`.
- File admin yang tidak diroute: `FinanceDashboard`, `DashboardUtama`, `ManajemenPengguna`, `TransaksiAdmin`, `PengaturanAdmin`, `MediasiKlaim`, `ModerasiAlat`, `DisputeResolverModal`.

**Dampak:** Dua sumber kebenaran navigasi, duplikasi perawatan, dan fitur yang "terlihat ada" tetapi tidak dapat diakses.

#### G-11. Penyimpanan file belum layak produksi

- Foto dikirim sebagai data URL base64 di JSON dan disimpan di MySQL.
- Limit 12 MB per request; tidak ada object storage, CDN, kompresi, atau lifecycle policy.
- Ini akan membengkakkan database dan memperlambat query order.

---

### 2.3 Temuan Menengah (P2) — Maintainability

- **Tidak ada server-state layer.** `frontend/package.json` hanya berisi React, axios, react-router, recharts. Tidak ada TanStack Query, Redux, atau Zustand. Setiap halaman mengelola fetch/loading/error sendiri.
- **Polling tersebar.** Chat 3 detik (`ChatPanel.jsx:219–222, 295–298`), notifikasi owner 10 detik.
- **Route legacy.** `/api/rentals` dan `/api/stats` masih in-memory dan tidak dipakai frontend.
- **Kontrak error belum seragam.** Sebagian route mengembalikan `{ error: { code, message } }`, sebagian `{ message }`.
- **Tidak ada feature flag** untuk memisahkan mode mock dan live payment.

---

## 3. Rekomendasi 3 Next Epic

### Epic 1 — Payment, Escrow & Settlement Engine

**Tujuan:** Satu sumber kebenaran untuk semua pergerakan uang: pembayaran, escrow, fee, refund, payout, pencairan, dan rekonsiliasi.

**Mengapa harus pertama:**
- Epic 2 (sengketa) dan Epic 3 (pembatalan/expiry) sama-sama membutuhkan service settlement yang sama.
- Jika Dispute dibangun lebih dulu, ia akan mewarisi empat rumus fee yang bertentangan.
- Risiko terbesar bisnis saat ini bukan kekurangan fitur, melainkan **uang yang tidak dapat direkonsiliasi**.

**Scope:**
- Payment gateway (rekomendasi: Midtrans Snap; adapter agar bisa swap ke Xendit).
- Model `Payment`, `PaymentEvent`, dan ledger double-entry.
- Satu service `settlementService` untuk menghitung dan memposting pembagian dana.
- Ganti mock-pay dan top-up instan.
- Refund otomatis saat order ditolak/dibatalkan.
- Perbaiki semantik pencairan (hold → approve → disbursed).
- Job kedaluwarsa pembayaran dan rekonsiliasi harian.
- Implementasi `GET /api/admin/financial/overview`.

**Endpoint plan:**

| Status | Endpoint | Keterangan |
|---|---|---|
| **Baru** | `POST /api/payments/intents` | Buat payment intent untuk order; return `redirectUrl`/`qrString`/`vaNumber`, `expiresAt` |
| **Baru** | `GET /api/payments/:id` | Status pembayaran untuk polling checkout |
| **Baru** | `POST /api/payments/webhook/:provider` | Verifikasi signature, idempotency, update status |
| **Baru** | `POST /api/admin/payments/:id/refund` | Refund penuh/sebagian |
| **Baru** | `GET /api/admin/financial/overview` | GMV, revenue, escrow liability, payout tertunda |
| **Baru** | `GET /api/admin/ledger/reconciliation` | Selisih ledger vs `walletBalance` |
| **Refactor** | `PATCH /api/orders/:id/mock-pay` | Pertahankan hanya untuk `PAYMENTS_MODE=mock` di development |
| **Refactor** | `POST /api/wallet/topup` | Ganti menjadi top-up via payment intent |
| **Refactor** | `POST /api/wallet/owner/withdraw` | Hold saldo, jangan tandai `BERHASIL` |
| **Refactor** | `PATCH /api/admin/withdrawals/:id/approve` | Posting ledger saat disbursement |
| **Refactor** | `PATCH /api/orders/:id/complete-inspection` | Panggil `settlementService`, bukan rumus lokal |
| **Refactor** | `PATCH /api/admin/disputes/:id/resolve` | Panggil `settlementService` |
| **Deprecate** | `PATCH /api/orders/:id/resolve-dispute` | Arahkan ke endpoint admin disputes |

**Perubahan data minimum:**

```prisma
model Payment {
  id           String   @id @default(uuid())
  orderId      String
  provider     String   // MIDTRANS | XENDIT
  providerRef  String
  method       String
  amount       Int
  status       String   // PENDING | PAID | EXPIRED | FAILED | REFUNDED
  expiresAt    DateTime
  paidAt       DateTime?
  createdAt    DateTime @default(now())

  @@unique([provider, providerRef])
  @@index([orderId])
}

model PaymentEvent {
  id         String   @id @default(uuid())
  provider   String
  eventId    String
  paymentId  String?
  payload    Json
  processedAt DateTime?

  @@unique([provider, eventId]) // idempotency
}

model LedgerTransaction {
  id             String   @id @default(uuid())
  type           String   // PAYMENT | SETTLEMENT | REFUND | WITHDRAWAL
  orderId        String?
  idempotencyKey String   @unique
  createdAt      DateTime @default(now())
  entries        LedgerEntry[]
}

model LedgerEntry {
  id            String   @id @default(uuid())
  transactionId String
  account       String   // ESCROW | OWNER_PAYABLE | PLATFORM_REVENUE | RENTER_WALLET | CASH | PROVIDER_FEE
  userId        String?
  amount        Int      // signed; total per transaction harus 0
}
```

**Keputusan finansial yang harus dikunci:**
- Platform fee **5% dari `rentalCost` saja**; shipping dan addons pass-through; deposit tidak dikenai fee.
- Fee di-snapshot ke `Order.platformFeeRate` saat order dibuat, bukan dibaca dari config saat settlement.
- Refund saat reject/cancel: kembalikan ke dompet atau sumber pembayaran, sesuai kebijakan.
- Status pencairan: `MENUNGGU → DIPROSES → SELESAI/DITOLAK`; `BERHASIL` hanya setelah dana benar-benar keluar.

**Urutan implementasi:**
1. Ledger + `settlementService` + backfill order lama (tanpa mengubah UI).
2. Payment intent + gateway sandbox + webhook + checkout polling.
3. Refund & expiry job.
4. Refactor withdrawal dan financial overview.
5. Hapus jalur mock dari production; aktifkan feature flag.

**Definition of Done:**
- Pembayaran sandbox end-to-end berhasil (QRIS/VA/e-wallet).
- Webhook duplikat tidak menggandakan saldo (idempotency test).
- `sum(LedgerEntry.amount) = 0` untuk setiap `LedgerTransaction`.
- `User.walletBalance` sama dengan proyeksi ledger untuk 100% user sampel.
- Order yang ditolak/dibatalkan otomatis direfund.
- Tidak ada lagi `mock-pay` yang bisa dipanggil di production.

**Risiko:** onboarding merchant account, biaya gateway, kebijakan refund, dan backfill data lama. Mitigasi: mulai dengan sandbox dan `PAYMENTS_MODE=mock` untuk demo.

---

### Epic 2 — Dispute & Claims Lifecycle 2.0

**Tujuan:** Sengketa menjadi alur dua arah yang lengkap: diajukan, diberi bukti, dibela, diputuskan, dan dieksekusi secara finansial.

**Mengapa kedua:**
- Pilar Mediasi saat ini adalah fitur yang **tampak selesai tetapi tidak pernah menerima data** — ini risiko kepercayaan yang lebih besar daripada kekurangan fitur baru.
- Eksekusi putusan membutuhkan `settlementService` dari Epic 1; membangunnya lebih dulu akan menduplikasi rumus uang.

**Scope:**
- Buat `DisputeTicket` pada setiap transisi order ke `DISPUTE`.
- Penyewa dapat mengajukan sengketa (bukan hanya pemilik).
- Penyewa dapat mengirim `renterDefenseNote` dan `renterCounterPhotos`.
- Model bukti terstruktur (`DisputeEvidence`) dan timeline.
- SLA dan aging sengketa.
- Satu endpoint keputusan kanonik; hapus duplikasi `orders/:id/resolve-dispute`.
- Notifikasi ke kedua pihak dan admin pada setiap transisi.

**Endpoint plan:**

| Status | Endpoint | Keterangan |
|---|---|---|
| **Baru** | `POST /api/orders/:id/disputes` | Pemilik atau penyewa membuat tiket; transaksi dengan update order |
| **Baru** | `GET /api/orders/:id/dispute` | Detail sengketa untuk pihak terkait |
| **Baru** | `POST /api/disputes/:id/evidence` | Unggah bukti (foto, catatan) |
| **Baru** | `POST /api/disputes/:id/defense` | Pembelaan penyewa |
| **Baru** | `POST /api/admin/disputes/:id/request-info` | Minta bukti tambahan |
| **Enhance** | `GET /api/admin/disputes` | Filter status, aging, nominal, pihak |
| **Enhance** | `GET /api/admin/disputes/:id` | Timeline + preview settlement |
| **Kanonik** | `PATCH /api/admin/disputes/:id/resolve` | Satu-satunya jalur keputusan |
| **Deprecate** | `PATCH /api/orders/:id/dispute` | Ganti dengan endpoint baru |
| **Deprecate** | `PATCH /api/orders/:id/resolve-dispute` | Ganti dengan endpoint admin |

**Perubahan data:**
- `DisputeTicket`: tambah `initiatedById`, `initiatedByRole`, `defendedAt`, `slaDueAt`, `resolutionType`, `evidence` relation.
- `DisputeEvidence`: `id`, `disputeId`, `uploadedById`, `type`, `url`, `note`, `createdAt`.
- Enum `DisputeStatus`: pertimbangkan `WAITING_RENTER_DEFENSE` dan `WAITING_ADMIN_REVIEW` agar SLA terlihat.
- `Notification`: pastikan bisa ditujukan ke penyewa, pemilik, dan admin.

**Aturan transisi:**
```
Order SEWA_AKTIF/INSPEKSI
  → POST disputes (pemilik/penyewa)
  → DisputeTicket OPEN + Order DISPUTE
  → evidence/defense
  → admin review
  → RESOLVED_RENTER_WIN | RESOLVED_OWNER_WIN | RESOLVED_SPLIT
  → settlementService + Order SELESAI
```

**Definition of Done:**
- Setiap order `DISPUTE` memiliki tepat satu `DisputeTicket`.
- `GET /api/admin/disputes` tidak pernah kosong saat ada order `DISPUTE`.
- Penyewa dapat mengajukan dan membela sengketa dari UI.
- Keputusan admin menghasilkan angka yang sama di ticket, order, ledger, dan dompet.
- Tidak ada endpoint keputusan duplikat yang masih dipakai frontend.
- Audit log mencatat aktor, waktu, dan nominal keputusan.

**Risiko:** definisi "menang" dan bukti yang sah harus disepakati operasional. Mitigasi: buat playbook mediasi dan SLA sebelum coding.

---

### Epic 3 — Booking, Availability & Inventory Integrity

**Tujuan:** Kalender dan stok menjadi proteksi nyata, bukan sekadar tampilan.

**Mengapa ketiga:**
- Dampaknya besar terhadap revenue dan kepuasan, tetapi **tidak menghambat** Epic 1–2.
- Justru setelah Epic 1 ada payment expiry, release inventory bisa diotomatisasi dengan benar.
- Overlap validation bersifat mandiri dan bisa dikerjakan tanpa menunggu gateway.

**Scope:**
- Validasi overlap dan stok di `POST /api/orders` dalam transaksi.
- Endpoint availability dan kalender.
- Hold inventaris dengan TTL yang terhubung ke payment expiry.
- Job pembatalan order kedaluwarsa.
- Blokir tanggal oleh pemilik (maintenance/offline).
- Perbaiki alur extend agar tidak menabrak booking berikutnya.
- Hormati `maintenanceBufferDays`.

**Endpoint plan:**

| Status | Endpoint | Keterangan |
|---|---|---|
| **Baru** | `GET /api/equipments/:id/availability?startDate=&endDate=` | `{ available, blockedRanges, stock, nextAvailableDate }` |
| **Baru** | `GET /api/equipments/:id/calendar?month=` | Data kalender otoritatif |
| **Baru** | `POST /api/owner/equipments/:id/blocked-dates` | Blokir tanggal |
| **Baru** | `DELETE /api/owner/equipments/:id/blocked-dates/:blockId` | Buka blokir |
| **Enhance** | `POST /api/orders` | Cek overlap + stok di dalam transaksi; 409 `EQUIPMENT_NOT_AVAILABLE` |
| **Enhance** | `PATCH /api/orders/:id/extend` | Cek booking berikutnya + buffer |
| **Baru** | Job `expire-unpaid-orders` | Setiap menit; batalkan order lewat `paymentDeadline` |
| **Baru** | `GET /api/admin/orders` | Monitor order (juga untuk Epic 4) |

**Algoritma booking:**
```
BEGIN TRANSACTION (Serializable)
  SELECT equipment FOR UPDATE
  hitung order aktif yang overlap:
    status IN (MENUNGGU_PEMBAYARAN, MENUNGGU_KONFIRMASI, DIKIRIM,
               SEWA_AKTIF, INSPEKSI, DISPUTE)
    dan rentang [start, end + maintenanceBufferDays] beririsan
  jika jumlah >= stock → 409
  buat order + reservationExpiresAt
COMMIT
```

**Catatan penting:**
- `stock` harus dihitung sebagai **jumlah unit paralel**, bukan boolean.
- `maintenanceBufferDays` harus masuk ke perhitungan overlap, bukan hanya `dayStatus`.
- Tambah status order `KEDALUWARSA` dan `DIBATALKAN`; saat ini cancel dan reject sama-sama memakai `DITOLAK`, sehingga analitik tidak bisa membedakan.
- Job expiry harus idempotent dan aman dijalankan lebih dari satu instance (gunakan `SELECT ... FOR UPDATE SKIP LOCKED` atau klaim job di tabel).

**Definition of Done:**
- Dua request booking bersamaan untuk alat yang sama: satu sukses, satu 409.
- Order tak dibayar otomatis dibatalkan dan alat kembali tersedia.
- Extend ditolak jika menabrak booking berikutnya.
- Kalender pemilik dan penyewa menampilkan sumber data yang sama dengan validasi backend.
- Tidak ada double-booking pada load test.

**Risiko:** perubahan perilaku checkout (hold lebih singkat) bisa menurunkan konversi. Mitigasi: hold 60 menit, tampilkan countdown yang jelas, dan fallback "notify me" untuk alat populer.

---

### Epic 4 — Admin Governance & Observability (Paralel, Bukan Top-3)

Kerjakan sebagai quick win di sela Epic 1–3, karena sebagian besar hanya membaca data yang sudah ada:

- `GET /api/admin/users` + detail + filter role/status/KYC.
- `GET /api/admin/orders` + filter status/tanggal/pihak.
- `GET /api/admin/audit-logs` (model `AdminAuditLog` sudah terisi).
- `GET /api/admin/financial/overview` (bagian dari Epic 1).
- Satukan shell `/portal-internal-hq` dan `/admin`; hapus atau hubungkan file mati.
- Bell notifikasi untuk penyewa dan admin.
- Hapus route legacy `/api/rentals` dan `/api/stats`.

**Mengapa bukan top-3:** tidak ada satupun yang memblokir transaksi atau menyebabkan kerugian finansial langsung. Namun, tanpa ini, operasional admin tetap buta setelah Epic 1–3 selesai.

---

## 4. Blocker & Keputusan Teknis

### 4.1 Payment Gateway & Webhook — **Blocker keras**

Ini bukan opsional. Tanpa webhook, status pembayaran hanya bisa ditebak dari client, yang tidak dapat dipercaya.

**Yang harus disiapkan:**
1. **Merchant account** dan sandbox Midtrans/Xendit (butuh legalitas usaha).
2. **Public HTTPS endpoint** untuk webhook. Untuk development: Cloudflare Tunnel atau ngrok.
3. **Verifikasi signature**:
   - Midtrans: `signature_key = SHA512(order_id + status_code + gross_amount + serverKey)`.
   - Xendit: callback token di header.
   - Jika provider memakai signature atas raw body (gaya Stripe), mount `express.raw()` **sebelum** `express.json()`.
4. **Idempotency**: unique constraint `(provider, eventId)`; webhook retry tidak boleh menggandakan saldo.
5. **Verifikasi nominal**: jangan hanya percaya status; cocokkan `orderId` dan `amount`.
6. **Fallback reconciliation**: polling status ke API provider untuk event yang hilang.
7. **Response cepat**: balas 2xx setelah event tersimpan; proses berat asynchronous.
8. **Security**: webhook endpoint tanpa JWT, tetapi dengan signature; rate limit; logging payload.

**Keputusan yang harus diambil:** Midtrans vs Xendit, metode apa yang didukung di MVP (QRIS + VA + e-wallet), siapa yang menanggung fee gateway, dan kebijakan refund.

### 4.2 Global State Management — **Blocker sedang, bukan alasan menunda**

Masalahnya bukan "butuh Redux", melainkan **server state tidak terkelola**. Saat ini setiap halaman punya fetch/loading/error sendiri, sehingga:
- Setelah pembayaran, daftar order dan dompet tidak otomatis segar.
- Setelah admin resolve dispute, dashboard pemilik/penyewa tidak ter-update.
- Polling manual mudah bocor dan sulit diuji.

**Rekomendasi:**
- **TanStack Query** untuk server state (cache, retry, invalidasi, polling).
- **AuthContext** tetap untuk identitas dan token.
- **Zustand** hanya jika ada UI state global yang benar-benar lintas halaman; jangan pakai Redux untuk MVP ini.
- Query key per domain: `['orders']`, `['order', id]`, `['wallet']`, `['admin','disputes']`.
- Invalidasi setelah mutation: payment success → invalidate order + wallet + notifications.
- Polling pembayaran: `refetchInterval` 2–3 detik hanya saat status `PENDING`.
- Global error boundary + axios interceptor untuk 401/403.

**Dampak jika ditunda:** UI finansial akan terus terasa "tidak sinkron" meskipun backend sudah benar. Ini bukan blocker backend, tetapi blocker kualitas produk.

### 4.3 WebSocket / Socket.io — **Bukan blocker pertama**

- Chat saat ini memakai polling 3 detik (`ChatPanel.jsx:219–222, 295–298`) dan notifikasi owner 10 detik (`OwnerDashboard.jsx:392–398`). Untuk skala awal, ini cukup.
- Payment status cukup dipolling 2–3 detik di halaman checkout; tidak perlu socket.
- Notifikasi dapat memakai polling 30 detik atau **SSE** (satu arah, lebih sederhana).
- Socket.io baru dibutuhkan ketika:
  - chat dipakai bersamaan oleh banyak pengguna,
  - notifikasi harus instan,
  - ada multi-instance backend (butuh Redis adapter + sticky session),
  - ada typing indicator/presence.

**Rekomendasi:** jangan jadikan Socket.io prasyarat Epic 1–3. Siapkan arsitektur agar nanti mudah ditambah: event bus internal, payload notifikasi yang konsisten, dan autentikasi handshake.

### 4.4 Auth, KYC, dan Keamanan

- Ganti OTP hardcoded dengan OTP per-user (hash, expiry, attempt limit).
- Tegakkan KYC di middleware untuk aksi sensitif: membuat order, mencairkan dana, mengajukan sengketa.
- Batasi CORS ke `config.corsOrigins`.
- Wajibkan `JWT_SECRET` di production; tambah refresh token dan rotasi.
- Tambah rate limit untuk login, OTP, top-up, dan webhook.
- Audit semua akses admin ke data sensitif.

### 4.5 Penyimpanan File

- Pindahkan foto KYC, BAST, dan bukti sengketa ke object storage (S3/R2/GCS).
- Simpan URL, bukan base64, di MySQL.
- Gunakan presigned URL untuk upload langsung dari client.
- Kompresi gambar di client sebelum upload; batasi tipe dan ukuran.
- Ini akan menurunkan ukuran request dari 12 MB menjadi jauh lebih kecil dan mempercepat query.

### 4.6 Migrasi & Backfill Ledger

- Jangan langsung mematikan `walletBalance`. Lakukan **expand-contract**:
  1. Tambah tabel ledger.
  2. Backfill dari order dan `WalletTransaction` lama.
  3. Dual-write di belakang feature flag.
  4. Bandingkan saldo ledger vs `walletBalance` setiap hari.
  5. Setelah selisih nol selama beberapa siklus, jadikan ledger sumber kebenaran.
- Siapkan laporan selisih dan mekanisme koreksi (adjustment entry), bukan update langsung.

---

## 5. Rencana Eksekusi yang Disarankan

| Sprint | Fokus | Deliverable | Gate |
|---|---|---|---|
| **Sprint 0** (1 minggu) | Keputusan & fondasi | Pilihan gateway, kebijakan fee/refund, desain ledger, feature flag, satukan shell admin | Sign-off produk + finance |
| **Sprint 1** (2 minggu) | Epic 1A | `Payment`, payment intent, webhook, checkout polling, sandbox E2E | Pembayaran sandbox sukses |
| **Sprint 2** (2 minggu) | Epic 1B | Ledger, `settlementService`, refund, expiry job, withdrawal semantics | Rekonsiliasi = 0 |
| **Sprint 3** (2 minggu) | Epic 2 | DisputeTicket creation, defense, evidence, admin resolve, notifikasi | Tidak ada order DISPUTE tanpa tiket |
| **Sprint 4** (2 minggu) | Epic 3 | Availability, overlap transaction, blocked dates, extend guard | Load test double-booking = 0 |
| **Sprint 5** (1 minggu) | Hardening & governance | Financial overview, user list, audit viewer, KYC enforcement, storage | UAT admin + security review |

**Paralel:** Epic 4 quick wins (user list, audit viewer, shell consolidation) dapat dikerjakan satu engineer di Sprint 1–4 tanpa memblokir jalur kritis.

---

## 6. Metrik Keberhasilan

| Metrik | Target |
|---|---|
| Payment success rate (sandbox → production) | ≥ 95% untuk metode yang didukung |
| Webhook duplication causing double credit | 0 |
| Selisih ledger vs `walletBalance` | 0 per hari |
| Order `DISPUTE` tanpa `DisputeTicket` | 0 |
| Waktu rata-rata resolusi sengketa | < 3 hari kerja |
| Double-booking pada load test | 0 |
| Order tak dibayar yang mengunci inventaris > 1 jam | 0 |
| Refund untuk order reject/cancel | 100% otomatis |

---

## 7. Keputusan yang Harus Diambil Minggu Ini

| Keputusan | Pemilik | Rekomendasi default |
|---|---|---|
| Gateway pembayaran | Product + Finance | Midtrans Snap (QRIS, VA, e-wallet) dengan adapter |
| Platform fee | Finance | 5% dari `rentalCost`, snapshot per order |
| Kebijakan refund | Product + Finance | Refund penuh saat reject/cancel sebelum BAST awal |
| Payment window | Product | 60 menit untuk semua metode (termasuk VA), dapat dikonfigurasi; release otomatis saat kedaluwarsa |
| Sumber kebenaran saldo | Engineering | Ledger; `walletBalance` hanya proyeksi |
| State management | Engineering | TanStack Query + AuthContext |
| Realtime | Engineering | Polling/SSE dulu; Socket.io setelah Epic 1–3 |
| Shell admin | Design + Engineering | Pertahankan `/admin`; redirect `/portal-internal-hq` |

---

## 8. Lampiran: Bukti Kode

| File | Baris | Temuan |
|---|---|---|
| `backend/prisma/schema.prisma` | 466 | `DisputeTicket` ada, tetapi tidak pernah dibuat |
| `backend/src/routes/admin/adminDisputes.js` | 303 | Hanya `disputeTicket.update`, bukan `create` |
| `backend/src/routes/orders.js` | 436 | `mock-pay` simulasi pembayaran |
| `backend/src/routes/orders.js` | 481–500 | Saldo penyewa dipotong untuk pembayaran `WALLET` |
| `backend/src/routes/orders.js` | 599–640 | Reject hanya set `DITOLAK`, tanpa refund |
| `backend/src/routes/orders.js` | 644–671 | Cancel hanya set `DITOLAK`, tanpa refund |
| `backend/src/routes/orders.js` | 1045–1075 | `complete-inspection` membayar 100%, tanpa fee |
| `backend/src/routes/orders.js` | 1237–1272 | `resolve-dispute` membayar 100%, tanpa fee |
| `backend/src/routes/admin/adminDisputes.js` | 288–291 | Fee 5% hanya di jalur admin disputes |
| `backend/src/routes/wallet.js` | 383–398 | `WalletTransaction` `BERHASIL` sebelum `WithdrawalRequest` `MENUNGGU` |
| `backend/src/routes/auth.js` | 572 | OTP admin hardcoded `123456` |
| `backend/src/config.js` | 12–13 | JWT fallback secret, expiry 7 hari |
| `backend/src/app.js` | 90–99 | CORS mengizinkan semua origin |
| `backend/src/app.js` | 102 | Body limit 12 MB untuk base64 |
| `backend/src/routes/orders.js` | 329–409 | `POST /orders` tanpa validasi overlap; `paymentDeadline` 24 jam |
| `backend/src/routes/orders.js` | 765 | Extend tanpa cek booking berikutnya |
| `backend/src/routes/equipments.js` | 277 | `dayStatus` hanya untuk tampilan kalender |
| `frontend/src/lib/apiClient.js` | 17 | Memanggil `/api/admin/financial/overview` yang tidak ada |
| `frontend/src/pages/admin/FinanceDashboard.jsx` | 66 | Metrik masih mock |
| `frontend/src/components/checkout/CheckoutStep3.jsx` | 2–10 | Checkout masih "Mock Payment" |
| `frontend/src/pages/OwnerDashboard.jsx` | 392–398 | Polling notifikasi 10 detik |
| `frontend/src/components/chat/ChatPanel.jsx` | 219–222, 295–298 | Polling chat 3 detik |
| `frontend/src/App.jsx` | 450, 506 | Dua shell admin |

---

## 9. Kesimpulan

MyRent tidak kekurangan layar admin. MyRent kekurangan **sistem keuangan yang dapat dipercaya** dan **siklus sengketa yang benar-benar berjalan**.

Jika hanya tiga hal yang boleh dikerjakan dalam kuartal ini:

1. **Uang harus nyata dan tercatat** — payment gateway, webhook, ledger, settlement.
2. **Sengketa harus punya tiket dan dua arah** — bukan tabel kosong.
3. **Kalender harus mengunci inventaris** — bukan sekadar warna di UI.

Selesaikan ketiganya, dan empat pilar admin yang sudah dibangun akan berubah dari "demo yang meyakinkan" menjadi **operasi yang dapat diaudit**.
