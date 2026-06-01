/* ==========================================================================
   SIMPELM — Konfigurasi Global
   --------------------------------------------------------------------------
   GANTI nilai GAS_URL di bawah dengan URL Web App Google Apps Script Anda
   setelah melakukan Deploy (lihat SETUP.md, langkah Deploy Web App).
   Contoh: https://script.google.com/macros/s/AKfycbx...../exec
   ========================================================================== */

const CONFIG = {
  // URL Web App Google Apps Script (endpoint API).
  GAS_URL: "https://script.google.com/macros/s/AKfycbwI2s8uDZXOtGQOA4KNEF_YFDL5ls2tjW2EuaX7mYmKDCooc8VJKt5TO4mw4c3GgRgX/exec",

  // Nama aplikasi & instansi
  APP_NAME: "SIMPELM",
  INSTANSI: "Dinas Pendidikan Kab. Deli Serdang",

  // Masa aktif token sesi (jam) — harus sama dengan setelan di GAS
  SESSION_HOURS: 8,

  // Cache data publik di localStorage (menit)
  PUBLIC_CACHE_MINUTES: 5,

  // Jumlah baris per halaman tabel
  PAGE_SIZE: 20,

  // Daftar peran
  ROLES: {
    super_admin: { label: "Super Admin", badge: "super" },
    admin: { label: "Admin Dinas", badge: "admin" },
    pengawas: { label: "Pengawas / KKG Kec", badge: "pengawas" },
    kkg_sekolah: { label: "Ketua KKG Sekolah", badge: "kkg_sekolah" }
  },

  // Pilihan dropdown
  HARI: ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  KELAS: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
  MAPEL: ["Matematika", "Bahasa Indonesia", "IPAS", "PKN", "PJOK", "SBdP", "PAI", "Bahasa Inggris"],
  SEMESTER: ["Semester 1", "Semester 2"]
};
