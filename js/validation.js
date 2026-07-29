/* ============================================================
   VALIDATION — Validasi form & token
   ============================================================ */

import { db } from './firebase.js';

export const DIVISI_LIST = [
    'Ketua Panitia',
    'Sekretaris',
    'Bendahara',
    'Sie Acara',
    'Sie Humas',
    'Sie Perlengkapan',
    'Sie Konsumsi',
    'PDD',
];

export const MASTER_PANITIA = [
  { nim: "255410026", nama: "Alvitho P Sipayung", divisi: "Ketua Panitia" },
  { nim: "255410043", nama: "Zul Ikhwanul Anggara", divisi: "Sekretaris" },
  { nim: "255410011", nama: "Maria Widya Febrianti", divisi: "Bendahara" },
  { nim: "255410024", nama: "Muhammad Rezky Ayyriel Ramadhan", divisi: "Sie Acara", isKoor: true },
  { nim: "255410078", nama: "Adina Larito", divisi: "Sie Acara" },
  { nim: "255410032", nama: "Rivael Takeshi Prabu", divisi: "Sie Acara" },
  { nim: "255410075", nama: "Hendrik Firmansyah", divisi: "Sie Acara" },
  { nim: "255410045", nama: "Odilia Valencia P.P", divisi: "Sie Acara" },
  { nim: "255410005", nama: "Rubu Yafo P Masneno", divisi: "Sie Humas", isKoor: true },
  { nim: "255410029", nama: "Yesaya Mexi Dasalaku", divisi: "Sie Humas" },
  { nim: "255410036", nama: "Maulana Giga Fachri Wibowo", divisi: "Sie Humas" },
  { nim: "255410014", nama: "Muhammad Jepri", divisi: "Sie Perlengkapan", isKoor: true },
  { nim: "255410010", nama: "Dzaky Aptanta", divisi: "Sie Perlengkapan" },
  { nim: "255410003", nama: "Francisco G I Da Costa Corbafo", divisi: "Sie Perlengkapan" },
  { nim: "255410042", nama: "Diana Amelia", divisi: "Sie Konsumsi", isKoor: true },
  { nim: "255410019", nama: "Laesah Afenlia", divisi: "Sie Konsumsi" },
  { nim: "255410080", nama: "Miftahul Hawaji", divisi: "Sie Konsumsi" },
  { nim: "255410018", nama: "Rayhan Pratama", divisi: "PDD", isKoor: true },
  { nim: "255410012", nama: "Dwi Ismi Andriani", divisi: "PDD" },
  { nim: "255410020", nama: "Neisa Putri Syifaul Qolby", divisi: "PDD" },
  { nim: "255410017", nama: "Usat Jalung", divisi: "PDD" },
];

export function findPanitiaByNim(nim) {
    if (!nim) return null;
    const cleanNim = String(nim).trim();
    return MASTER_PANITIA.find(p => p.nim === cleanNim) || null;
}

export function getPanitiaBelumHadir(attendedData = []) {
    const attendedNims = new Set(attendedData.map(d => String(d.nim).trim()));
    return MASTER_PANITIA.filter(p => !attendedNims.has(p.nim));
}

/**
 * Validasi form presensi sisi client.
 * @param {string} nama
 * @param {string} nim
 * @param {string} divisi
 * @returns {{ valid: boolean, errors: object }}
 */
export function validateForm(nama, nim, divisi) {
    const errors = {};

    if (!nama || nama.trim().length < 2) {
        errors.nama = 'Nama harus diisi minimal 2 karakter';
    }

    if (!nim || nim.trim().length === 0) {
        errors.nim = 'NIM harus diisi';
    } else if (!/^\d+$/.test(nim.trim())) {
        errors.nim = 'NIM hanya boleh berisi angka';
    }

    if (!divisi) {
        errors.divisi = 'Silakan pilih divisi';
    } else if (!DIVISI_LIST.includes(divisi)) {
        errors.divisi = 'Divisi tidak valid';
    }

    return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validasi token.
 * Mengecek apakah token cocok dengan token aktif dan belum expired.
 * @param {string} token
 * @param {object|null} [settings=null] — settings dari listener (optional). Fallback ke db.settings.get() jika tidak ada.
 * @returns {{ valid: boolean, message: string, settings: object|null }}
 */
export function validateToken(token, settings = null) {
    if (!token || token.trim().length !== 6) {
        return { valid: false, message: 'Token harus berisi 6 digit angka', settings: null };
    }

    const s = settings || db.settings.get();

    if (!s || !s.currentToken) {
        return { valid: false, message: 'Token belum di-generate oleh Admin. Silakan buka Dashboard Admin untuk generate token.', settings: null };
    }

    const now = Date.now();
    const expiredAt = s.expiredAt || 0;

    if (s.currentToken !== token.trim()) {
        return { valid: false, message: 'Token salah / tidak cocok', settings: s };
    }

    if (now > expiredAt) {
        return { valid: false, message: 'Token sudah kadaluwarsa. Minta Admin generate token baru.', settings: s };
    }

    return { valid: true, message: 'Token valid', settings: s };
}

/**
 * Cek apakah peserta sudah pernah presensi (berdasarkan NIM).
 * @param {string} nim
 * @returns {boolean}
 */
export function isAlreadyAttend(nim) {
    return db.attendance.existsByNim(nim);
}
