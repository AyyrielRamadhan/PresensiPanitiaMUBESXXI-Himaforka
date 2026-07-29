<div align="center">
  <img src="assets/logo.svg" alt="HIMAFORKA" width="120" height="120">
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

## 🚀 Cara Menjalankan

1. **Clone repositori ini**
   ```bash
   git clone https://github.com/username/PresensiPanitiaMubes.git
   cd PresensiPanitiaMubes
   ```

2. **Buka di browser**
   - Buka file `index.html` langsung, atau
   - Gunakan Live Server (VS Code) / `npx serve` agar ES Modules berjalan sempurna

3. **Login**
   - **Admin:** `admin@himaforka.ac.id` / `Ayyrielganteng06`
   - **Panitia:** Masukkan nama & NIM (9 digit)

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

---

## 📸 Tampilan

> _🎯 Tambahkan screenshot di sini:_
> - `screenshots/login.png` — Halaman login
> - `screenshots/dashboard.png` — Dashboard admin
> - `screenshots/attendance.png` — Form presensi

---

## 📄 Lisensi

Distribusikan di bawah lisensi **MIT**. Lihat file `LICENSE` untuk detail lebih lanjut.

---

<div align="center">
  Dibuat dengan ❤️ oleh <strong>Tim HIMAFORKA</strong>
</div>
