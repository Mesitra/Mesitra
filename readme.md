# Mesitra

Platform manajemen rental (properti, kendaraan, peralatan) — React + Vite (frontend) dan Express.js (backend).

## Struktur

```
frontend/   React 19 + Vite + Tailwind CSS v4
backend/    Express.js API (in-memory store, kontrak OpenAPI)
```

## Menjalankan

### Backend

```bash
cd backend
npm install
npm run dev        # http://localhost:3000
npm test           # test suite kontrak API
```

Kontrak API: [`backend/openapi.yaml`](backend/openapi.yaml) (juga disajikan di `GET /openapi.yaml`).
Detail lain ada di [`backend/README.md`](backend/README.md).

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Dev server Vite sudah mem-proxy semua request `/api/*` ke `http://localhost:3000`,
jadi cukup jalankan backend dan frontend berdampingan.

## Endpoint API

| Method | Path | Deskripsi |
| --- | --- | --- |
| GET | `/api/health` | Status service |
| POST | `/api/auth/register` | Registrasi + pengajuan KYC (Step 1-5) |
| POST | `/api/auth/login` | Login (mengembalikan status verifikasi) |
| GET | `/api/auth/submission-status/:emailOrId` | Status pengajuan verifikasi |
| GET | `/api/admin/submissions` | Daftar pengajuan (JWT admin) |
| GET | `/api/admin/submissions/:id` | Detail pengajuan (JWT admin) |
| PATCH | `/api/admin/submissions/:id/approve` | Setujui pengajuan |
| PATCH | `/api/admin/submissions/:id/revision` | Minta perbaikan |
| PATCH | `/api/admin/submissions/:id/reject` | Tolak pengajuan |
| GET | `/api/rentals` | Daftar unit (filter, search, sort, pagination) |
| POST | `/api/rentals` | Tambah unit |
| GET | `/api/rentals/:id` | Detail unit |
| PATCH | `/api/rentals/:id` | Update unit |
| DELETE | `/api/rentals/:id` | Hapus unit |
| GET | `/api/categories` | Kategori + jumlah unit |
| GET | `/api/equipments` | Katalog alat tersedia (status `TERSEDIA`) + info pemilik |
| GET | `/api/equipments/:id` | Detail satu alat |
| GET | `/api/stats` | Ringkasan dashboard |

## Alur Registrasi & Verifikasi Admin

1. Penyewa/Pemilik mengisi formulir 5 langkah (`/register/penyewa`, `/register/pemilik`).
   Draft tersimpan otomatis di `localStorage` (`mesitra_draft_penyewa` /
   `mesitra_draft_pemilik`) sehingga data tidak hilang saat user bolak-balik
   ke halaman login.
2. Setelah dikirim, pengajuan masuk antrean admin dengan status `MENUNGGU`
   dan dikunci (anti-spam) lewat `localStorage` (`mesitra_pending_penyewa` /
   `mesitra_pending_pemilik`).
3. Admin memverifikasi lewat portal `/portal-internal-hq/dashboard`:
   setujui / minta perbaikan / tolak.
4. Saat user login:
   - `DISETUJUI` → langsung ke `/beranda-sewa`
   - `MENUNGGU` / `PERLU_PERBAIKAN` → diarahkan ke layar status verifikasi
   - `DITOLAK` → pesan penolakan permanen ditampilkan di form login

Sesi admin memakai key `localStorage` terpisah (`admin_token` / `admin_user`)
sehingga tidak menimpa sesi penyewa.
