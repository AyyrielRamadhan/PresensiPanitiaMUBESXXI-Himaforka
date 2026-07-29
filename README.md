<div align="center">
  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiB2aWV3Qm94PSIwIDAgMTIwIDEyMCI+CiAgPGNpcmNsZSBjeD0iNjAiIGN5PSI2MCIgcj0iNTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzdhMDAxYSIgc3Ryb2tlLXdpZHRoPSI0Ii8+CiAgPHBhdGggZD0iTTQwIDU1bDEyIDEyIDI4LTI4IiBzdHJva2U9IiM3YTAwMWEiIHN0cm9rZS13aWR0aD0iNiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CiAgPHRleHQgeD0iNjAiIHk9IjEwMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXdlaWdodD0iYm9sZCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzdhMDAxYSI+SElNQUZPUktBPC90ZXh0Pgo8L3N2Zz4K" alt="HIMAFORKA" width="120" height="120">
  <br>
  <h1>📋 Presensi Panitia MUBES XXI</h1>
  <p><strong>Sistem Presensi Digital berbasis QR Code & Token</strong></p>
  <p>Himpunan Mahasiswa Informatika & FORSI — Universitas</p>

  <br>

  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=fff">
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000">
  <img src="https://img.shields.io/badge/localStorage-FF6F00?logo=googlechrome&logoColor=fff">
  <img src="https://img.shields.io/badge/license-MIT-blue">
</div>

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| **🔐 Dual Role Login** | Admin & Panitia (login via NIM) dengan redirect otomatis |
| **🎫 Token 6 Digit** | Token numerik dengan countdown & auto-generate berkala |
| **📷 Scan QR Code** | Peserta scan QR dari dashboard admin via kamera HP |
| **📊 Dashboard Admin** | Statistik kehadiran, tabel data, grafik divisi, riwayat terbaru |
| **📤 Export Excel** | Unduh data presensi ke format `.xlsx` (SheetJS) |
| **⚙️ Pengaturan Token** | Interval kustom (30–300 detik) & mode auto-generate |
| **📱 Responsive** | Tampilan optimal di desktop & mobile |
| **🔋 Zero Dependencies** | Bisa jalan langsung tanpa server — cukup buka di browser |

---

## 🧱 Struktur Proyek

```
PresensiPanitiaMubes/
├── index.html          # Halaman login
├── dashboard.html      # Dashboard admin (terproteksi)
├── attendance.html     # Form presensi panitia (terproteksi)
├── css/
│   ├── style.css       # Gaya global
│   ├── dashboard.css   # Dashboard & komponen
│   ├── login.css       # Halaman login
│   ├── attendance.css  # Form presensi
│   └── responsive.css  # Breakpoint mobile
├── js/
│   ├── auth.js         # Otentikasi & redirect
│   ├── dashboard.js    # Logika dashboard admin
│   ├── attendance.js   # Logika form presensi
│   ├── firebase.js     # Abstraksi database (localStorage)
│   ├── export.js       # Export ke Excel
│   ├── qrcode-gen.js   # Generate QR Code
│   ├── scanner.js      # Scan QR Code via kamera
│   ├── settings.js     # Pengaturan token
│   ├── token.js        # Manajemen token & expiry
│   ├── utils.js        # Utility (toast, modal, dll)
│   └── validation.js   # Validasi form & token
├── assets/
│   ├── favicon.svg     # Ikon browser
│   └── logo.svg        # Logo HIMAFORKA
└── README.md
```

---

## 🗄️ Penyimpanan Data

Semua data disimpan di **localStorage** browser:

| Key | Deskripsi |
|---|---|
| `mubes_attendance` | Data presensi (nama, NIM, divisi, token, timestamp) |
| `mubes_settings`   | Konfigurasi token & auto-generate |
| `mubes_auth`       | Sesi login user |

> 🔁 **Siap upgrade ke Firebase?** Cukup ganti `js/firebase.js` dengan inisialisasi Firestore — API-nya sudah identik, tidak perlu ubah file lain.

---

## 🛠️ Teknologi

- **HTML5** + **CSS3** (Vanilla, tanpa framework)
- **JavaScript ES Modules** (Vanilla, tanpa bundler)
- **QRCode.js** — Generate QR Code
- **html5-qrcode** — Scan QR Code via kamera
- **SheetJS (xlsx)** — Export ke Excel
- **Bootstrap Icons** — Ikon UI
- **Google Fonts (Poppins)** — Tipografi

## 📄 Lisensi

Distribusikan di bawah lisensi **MIT**. Lihat file `LICENSE` untuk detail lebih lanjut.

---

<div align="center">
  Dibuat dengan ❤️ oleh <strong>Tim HIMAFORKA</strong>
</div>
