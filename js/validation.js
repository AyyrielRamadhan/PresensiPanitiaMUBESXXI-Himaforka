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
 * @returns {{ valid: boolean, message: string, settings: object|null }}
 */
export function validateToken(token) {
    if (!token || token.trim().length !== 6) {
        return { valid: false, message: 'Token harus 6 karakter', settings: null };
    }

    const settings = db.settings.get();

    if (!settings.currentToken) {
        return { valid: false, message: 'Token belum di-generate', settings: null };
    }

    const now = Date.now();
    const expiredAt = settings.expiredAt || 0;

    if (settings.currentToken !== token.trim()) {
        return { valid: false, message: 'Token tidak cocok', settings };
    }

    if (now > expiredAt) {
        return { valid: false, message: 'Token sudah kedaluwarsa', settings };
    }

    return { valid: true, message: 'Token valid', settings };
}

/**
 * Cek apakah peserta sudah pernah presensi (berdasarkan NIM).
 * @param {string} nim
 * @returns {boolean}
 */
export function isAlreadyAttend(nim) {
    return db.attendance.existsByNim(nim);
}
