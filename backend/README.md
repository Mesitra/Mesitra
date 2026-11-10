# Mesitra API (backend)

Backend Express.js untuk platform manajemen sewa alat Mesitra.

## Menjalankan

```bash
cd backend
npm install
npm run dev     # development dengan auto-reload (node --watch)
npm start       # production
npm test        # jalankan test suite (node:test, tanpa dependensi ekstra)
```

Server berjalan di `http://localhost:3000` (atur lewat `PORT`, lihat `.env.example`).

## Dokumentasi

Kontrak API ada di [`openapi.yaml`](./openapi.yaml) dan juga dilayani langsung oleh server
di `http://localhost:3000/openapi.yaml`. Daftar endpoint tersedia di `GET /`.

## Endpoint

| Method | Path | Deskripsi |
| --- | --- | --- |
| GET | `/api/health` | Status service (readiness/liveness) |
| POST | `/api/auth/register` | Registrasi + kirim pengajuan KYC (Step 1-5) |
| POST | `/api/auth/login` | Login → token JWT + status verifikasi |
| GET | `/api/auth/submission-status/:emailOrId` | Status pengajuan (email / id / kode) |
| GET | `/api/admin/submissions` | Daftar pengajuan (JWT admin) |
| GET | `/api/admin/submissions/:id` | Detail pengajuan (JWT admin) |
| PATCH | `/api/admin/submissions/:id/approve` | Setujui → `DISETUJUI` |
| PATCH | `/api/admin/submissions/:id/revision` | Minta perbaikan → `PERLU_PERBAIKAN` |
| PATCH | `/api/admin/submissions/:id/reject` | Tolak permanen → `DITOLAK` |
| GET | `/api/rentals` | Daftar unit — filter `category`, `status`, `search`, `sort`, `order`, `page`, `limit` |
| POST | `/api/rentals` | Tambah unit baru |
| GET | `/api/rentals/:id` | Detail unit |
| PATCH | `/api/rentals/:id` | Update sebagian field |
| DELETE | `/api/rentals/:id` | Hapus unit |
| GET | `/api/categories` | Kategori + jumlah unit |
| GET | `/api/equipments` | Katalog alat tersedia (status `TERSEDIA`) + info pemilik — filter `category`, `search`, `ownerId` |
| GET | `/api/equipments/:id` | Detail satu alat |
| GET | `/api/stats` | Ringkasan dashboard |

## Alur verifikasi KYC

```
Penyewa/Pemilik daftar  →  POST /api/auth/register  →  status MENUNGGU
Admin tinjau            →  GET  /api/admin/submissions
Admin setujui           →  PATCH .../approve   → DISETUJUI   (akun boleh masuk /beranda-sewa)
Admin minta perbaikan   →  PATCH .../revision  → PERLU_PERBAIKAN (step + catatan)
Admin tolak             →  PATCH .../reject    → DITOLAK
```

- Data formulir Step 1-5 disimpan pada kolom JSON `User.kycData`.
- Unggahan foto **tidak pernah divalidasi** di backend: nama file, metadata
  `{ name, size, type }`, maupun data URL sama-sama diterima dan dinormalisasi
  oleh `src/lib/kyc.js`.
- `User.submissionCode` berisi kode unik pengajuan (mis. `VR-2041`).
- `User.revisionSteps` berisi array nomor step yang diminta diperbaiki admin,
  `User.adminNote` berisi catatan alasan.

## Database (Prisma + MySQL)

```bash
cd backend
npx prisma migrate dev      # terapkan migrasi (membuat file + menerapkan ke DB)
npx prisma generate         # regenerate Prisma Client
npm run seed                # akun admin + akun PEMILIK dummy + katalog alat contoh
```

Koneksi MySQL diambil dari `DATABASE_URL` (lihat `.env`).

Seeder membuat:

- 2 akun admin (`admin@mesitra.id`, `rani.admin@gmail.com`)
- 1 akun **PEMILIK** dummy (`pemilik@mesitra.id` / `Pemilik#Sewa2026`) sebagai pemilik katalog
- 6 unit alat milik akun tersebut (5 `TERSEDIA` + 1 `DISEWA` sebagai kontrol filter)

## Struktur

```
src/
  index.js              # bootstrap server
  app.js                # perakitan Express app (middleware + routes)
  config.js             # port, CORS, env
  data/seed.js          # data seed rental
  store/rentals.js      # penyimpanan in-memory (ganti dengan DB di sini)
  lib/                  # konstanta, error, validasi, kyc, submissionCode
  middleware/           # request id, logger, error handler, adminAuth (JWT admin)
  routes/               # health, auth, admin, rentals, equipments, categories, stats
prisma/
  schema.prisma         # User (+ status verifikasi & kycData), Equipment (katalog alat)
  seed.js               # akun admin + akun pemilik + katalog alat contoh
test/api.test.js        # test kontrak end-to-end
```

Catatan: endpoint `/api/rentals` masih memakai penyimpanan in-memory (data kembali
ke seed setiap restart) lewat `src/store/rentals.js`. Endpoint katalog
`/api/equipments` sudah memakai MySQL via Prisma.
