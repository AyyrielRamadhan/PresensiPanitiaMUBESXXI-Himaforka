<div align="center">
  <h1>📋 Presensi Panitia MUBES XXI</h1>
  <p><strong>Sistem Presensi Digital berbasis QR Code & Token</strong></p>
  <p>Himpunan Mahasiswa Informatika & FORSI — Universitas</p>

  <br>

  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=fff">
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000">
  <img src="https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=000">
  <img src="https://img.shields.io/badge/localStorage-FF6F00?logo=googlechrome&logoColor=fff">
  <img src="https://img.shields.io/badge/license-MIT-blue">
</div>

---

## ✨ Fitur

| Fitur | Deskripsi |
| --- | --- |
| **🔐 Dual Role Login** | Admin & Panitia (login via NIM) dengan redirect otomatis |
| **🎫 Token 6 Digit** | Token numerik dengan countdown & auto-generate berkala |
| **📷 Scan QR Code** | Peserta scan QR dari dashboard admin via kamera HP |
| **📊 Dashboard Admin** | Statistik kehadiran, tabel data, grafik divisi, riwayat terbaru |
| **📤 Export Excel** | Unduh data presensi ke format `.xlsx` (SheetJS) |
| **⚙️ Pengaturan Token** | Interval kustom (30–300 detik) & mode auto-generate |
| **⚡ Hybrid Storage** | Firestore Cloud Sync dengan Otomatis Fallback ke LocalStorage jika offline/gagal |
| **📱 Responsive** | Tampilan optimal di desktop & mobile |

---

## ⚡ Fitur Hybrid Storage Engine

Sistem ini dilengkapi **Hybrid Storage Manager** pada `js/firebase.js`:

1. **🟢 Cloud Sync (Firebase Firestore)**: Apabila Firebase Firestore aktif dan terhubung, data token & presensi tersinkronisasi secara *realtime* di seluruh perangkat.
2. **🟡 Local Storage Mode (Offline / Fallback)**: Apabila Firebase Firestore mengalami kendala jaringan atau *security rules* menolak akses, sistem otomatis beralih ke `localStorage` tanpa menyebabkan aplikasi *crash* atau *stuck* di layar "Memuat...".

---

## 🚀 Cara Menjalankan Lokal

Disarankan menggunakan dev server HTTP lokal (agar fitur ES Modules dan Kamera Scan QR berjalan optimal):

```bash
# Menggunakan npx serve
npx serve .

# Atau menggunakan Python HTTP Server
python -m http.server 8000
```
Buka `http://localhost:3000` atau `http://localhost:8000` di browser.

### Credential Default Login
- **Admin**: Username `admin@himaforka.ac.id` | Password `Ayyrielganteng06`
- **Panitia**: Username `Nama Panitia` | Password `NIM (Angka, min 8-12 digit)`

---

## 🔧 Konfigurasi Firebase Firestore Rules (Opsional)

Jika ingin menggunakan Firebase Cloud Sync antar-perangkat, buka **Firebase Console > Firestore Database > Rules** dan atur aturan ke:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

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
│   ├── firebase.js     # Hybrid storage engine (Firebase Firestore + LocalStorage)
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

<div align="center">
  Dibuat dengan ❤️ oleh <strong>Tim HIMAFORKA</strong>
</div>
