# SIMPELM — Panduan Setup & Deploy

**Sistem Informasi Pembelajaran Mendalam** — Dinas Pendidikan Kabupaten Deli Serdang
Frontend: **GitHub Pages** · Backend: **Google Apps Script** · Database: **Google Sheets**

---

## Arsitektur Singkat

```
Browser (GitHub Pages, statis)
   │  fetch JSON (POST, Content-Type text/plain)
   ▼
Google Apps Script Web App  (REST API + autentikasi token)
   │  baca / tulis
   ▼
Google Sheets  (8 tab data + 1 tab sesi)
```

Semua file media (modul, PPT, video, foto) **tidak diunggah** ke sistem — cukup simpan di Google Drive lalu tempelkan tautannya.

---

## Struktur File Proyek

```
/
├── index.html            ← Landing page (Beranda)
├── login.html            ← Halaman masuk
├── dashboard.html        ← Dashboard (Admin Dinas / Super Admin)
├── bimtek.html           ← Modul 1 — Bimtek & Workshop
├── pendampingan.html     ← Modul 2 — Pendampingan
├── kkg.html              ← Modul 3 — Jadwal KKG Daring
├── modul-ajar.html       ← Modul 4 — Modul Ajar PM
├── akun.html             ← Kelola Akun (Super Admin)
├── profil.html           ← Profil & ganti password
├── .nojekyll             ← agar GitHub Pages tidak memproses Jekyll
├── assets/
│   ├── css/app.css       ← Design system bersama
│   └── js/
│       ├── config.js     ← ⚙️ ISI GAS_URL DI SINI
│       └── app.js        ← API client, auth, UI, tabel
└── gas/
    └── Code.gs           ← Backend Google Apps Script
```

---

## Langkah 1 — Siapkan Google Sheets (Database)

1. Buka <https://sheets.google.com> → buat **Spreadsheet baru**, beri nama `SIMPELM_Database`.
2. Catat **ID spreadsheet** dari URL:
   `https://docs.google.com/spreadsheets/d/`**`<ID-DI-SINI>`**`/edit`

## Langkah 2 — Buat Backend Apps Script

1. Dari spreadsheet tadi: menu **Extensions → Apps Script** (script akan otomatis *bound* ke spreadsheet — biarkan `SPREADSHEET_ID` kosong).
   *Alternatif standalone:* buka <https://script.google.com> → New project, lalu isi `SPREADSHEET_ID` di `Code.gs` dengan ID dari Langkah 1.
2. Hapus isi `Code.gs` bawaan, **salin seluruh isi** `gas/Code.gs` dari proyek ini ke sana. **Simpan** (Ctrl+S).
3. Di daftar fungsi (atas), pilih **`setupSpreadsheet`** → klik **Run**.
   - Saat diminta, **Review permissions → Allow** (login akun Google dinas).
   - Fungsi ini membuat 9 tab + akun awal.
4. Cek log (View → Logs). Akan muncul:
   ```
   Akun awal dibuat → username: superadmin | password: Admin#2026
   ```

## Langkah 3 — Deploy sebagai Web App (API)

1. Klik **Deploy → New deployment**.
2. **Select type** (ikon gerigi) → **Web app**.
3. Isi:
   - **Description**: `SIMPELM API`
   - **Execute as**: **Me** (akun dinas)
   - **Who has access**: **Anyone**
4. **Deploy** → **Authorize** jika diminta → salin **Web app URL** (berakhiran `/exec`).

> Setiap kali Anda mengubah `Code.gs`, lakukan **Deploy → Manage deployments → Edit (pensil) → Version: New version → Deploy** agar URL yang sama memuat kode terbaru.

## Langkah 4 — Hubungkan Frontend

1. Buka `assets/js/config.js`.
2. Ganti nilai `GAS_URL` dengan Web app URL dari Langkah 3:
   ```js
   GAS_URL: "https://script.google.com/macros/s/AKfycb..../exec",
   ```
3. Simpan.

**Tes cepat:** buka Web app URL di browser. Harus muncul JSON:
`{"ok":true,"data":{"service":"SIMPELM API",...}}`

## Langkah 5 — Deploy Frontend ke GitHub Pages

1. Buat repo GitHub baru, mis. `simpelm` (boleh privat lalu Pages, atau publik).
2. Upload **semua file** proyek ini ke repo (drag-and-drop di web GitHub, atau `git push`):
   ```bash
   git init
   git add .
   git commit -m "SIMPELM v1.0"
   git branch -M main
   git remote add origin https://github.com/<user>/simpelm.git
   git push -u origin main
   ```
3. Di repo → **Settings → Pages**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)` → **Save**.
4. Tunggu 1–2 menit. Situs aktif di:
   `https://<user>.github.io/simpelm/`

> ⚠️ Jangan unggah folder `gas/` ke hosting sebagai bagian yang dipakai — ia hanya referensi kode backend. Tidak masalah jika ikut ter-upload (file `.gs` tidak akan dieksekusi oleh GitHub Pages).

---

## Login Pertama

| Field | Nilai |
|------|-------|
| URL | `https://<user>.github.io/simpelm/login.html` |
| Username | `superadmin` |
| Password | `Admin#2026` |

**Segera ganti password** lewat menu **Profil** setelah masuk.

---

## Mengisi Data Master (lewat Google Sheets langsung)

Sebelum modul dipakai optimal, isi tab master:

- **`2_Kecamatan`** — satu baris per rayon: `id, nama_kecamatan, nama_rayon, maks_sekolah, jumlah_sekolah_aktual`
  Contoh: `1, Percut Sei Tuan, Rayon 1, 60, 58`
- **`3_Sekolah`** — daftar SD: `id, npsn, nama_sekolah, kecamatan, rayon, status_aktif`
- Akun Pengawas & Ketua KKG dibuat lewat halaman **Kelola Akun** (Super Admin) — bukan diketik manual, agar password ter-hash otomatis.

> **Penting:** kolom `kecamatan` pada akun Pengawas harus **sama persis** dengan `nama_kecamatan` di tab `2_Kecamatan`/`3_Sekolah` agar dropdown sekolah & rayon ter-filter benar. Kolom `sekolah` pada akun Ketua KKG Sekolah harus sama dengan `nama_sekolah` di `3_Sekolah`.

---

## Peran & Hak Akses

| Peran (`role`) | Akses |
|----------------|-------|
| `super_admin`  | Semua — Kelola Akun, Dashboard, seluruh modul |
| `admin`        | Dashboard + input/edit/hapus Bimtek, lihat semua data |
| `pengawas`     | Input Pendampingan (Modul 2) + atur Jadwal KKG (Modul 3) kecamatannya |
| `kkg_sekolah`  | Setup tim + laporan Modul Ajar (Modul 4) sekolahnya |
| publik (tanpa login) | Lihat Bimtek, ringkasan Pendampingan, Jadwal KKG, daftar Modul Ajar |

---

## Keamanan (sesuai PRD §7.4)

- Password disimpan sebagai **hash SHA-256**, tidak pernah plaintext.
- **Token sesi** 32 karakter, masa aktif **8 jam**, disimpan di `localStorage` & tab `_Sessions`.
- **Rate limiting**: 5 kali gagal login → akun terkunci 15 menit.
- Input di-**sanitasi** di sisi GAS untuk mencegah *formula injection* di Sheets.
- Validasi URL: field tautan wajib diawali `https://`.

> Karena GitHub Pages dan Apps Script berbeda origin, token dikirim di **body** request (bukan header) dan `Content-Type: text/plain` digunakan untuk menghindari CORS preflight. Ini pilihan desain yang aman untuk token bertipe sesi.

---

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| `GAS_URL belum dikonfigurasi` | Isi `GAS_URL` di `assets/js/config.js` (Langkah 4). |
| `Gagal terhubung ke server` | Pastikan deployment **Who has access: Anyone**; re-deploy versi baru setelah edit `Code.gs`. |
| Data tidak muncul setelah edit `Code.gs` | Buat **New version** saat manage deployments. |
| Dropdown sekolah/rayon kosong | Isi tab `3_Sekolah` & `2_Kecamatan`, dan pastikan `kecamatan` akun cocok. |
| Login selalu gagal | Jalankan ulang `setupSpreadsheet`; cek tab `1_Users` punya baris superadmin. |

---

## Batasan Versi 1.0 (sesuai PRD §9.2)

Tidak termasuk: upload file langsung, ekspor PDF/Excel, notifikasi push/email, absensi KKG, data MI, dan fitur komentar antar pengguna.
