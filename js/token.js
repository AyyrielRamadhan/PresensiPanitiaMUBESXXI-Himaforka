/* ============================================================
   TOKEN — Generator & manajemen token presensi
   ============================================================ */

import { db, serverTimestamp } from './firebase.js';

const CHARS = '0123456789';

/* ---------- STATE ---------- */
let currentSettings = { currentToken: '', expiredAt: Date.now(), interval: 60, autoGenerate: true };
let listeners = [];

/**
 * Generate token acak 6 karakter.
 * @returns {string}
 */
export function generateTokenString() {
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return token;
}

function calculateExpiry(interval) {
    return Date.now() + interval * 1000;
}

/**
 * Ambil settings terbaru.
 * @returns {object}
 */
export function getSettings() {
    const stored = db.settings.get();
    currentSettings = { ...currentSettings, ...stored };
    return { ...currentSettings };
}

/**
 * Subscribe perubahan settings.
 * @param {Function} callback
 * @returns {Function} unsubscribe
 */
export function onSettingsChange(callback) {
    listeners.push(callback);
    callback(getSettings());
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
}

/**
 * Load settings dari localStorage.
 * @returns {object}
 */
export function loadSettings() {
    return getSettings();
}

/**
 * Generate token baru dan simpan.
 * @param {number|null} interval
 * @returns {string}
 */
export async function generateNewToken(interval = null) {
    const token = generateTokenString();
    const settings = getSettings();
    const intv = interval || settings.interval || 60;
    const expiredAt = calculateExpiry(intv);

    await db.settings.set({
        currentToken: token,
        expiredAt,
        interval: intv,
        autoGenerate: settings.autoGenerate,
    });

    currentSettings = db.settings.get();
    notifyListeners();
    return token;
}

/**
 * Set interval token.
 * @param {number} seconds
 */
export async function setInterval_(seconds) {
    await db.settings.update({ interval: seconds });
    currentSettings = db.settings.get();
    notifyListeners();
}

/**
 * Set auto generate.
 * @param {boolean} enabled
 */
export async function setAutoGenerate(enabled) {
    await db.settings.update({ autoGenerate: enabled });
    currentSettings = db.settings.get();
    notifyListeners();
}

function notifyListeners() {
    const s = getSettings();
    listeners.forEach(cb => {
        try { cb(s); } catch (e) { console.error(e); }
    });
}

/**
 * Init listener perubahan settings (polling-based).
 * @param {Function} onUpdate
 * @returns {Function} unsubscribe
 */
export function initSettingsListener(onUpdate) {
    const unsub = db.settings.onSnapshot((data) => {
        currentSettings = { ...currentSettings, ...data };
        notifyListeners();
        if (typeof onUpdate === 'function') {
            onUpdate(getSettings());
        }
    });
    return unsub;
}

/**
 * Hapus seluruh data attendance.
 */
export async function clearAllAttendance() {
    await db.attendance.deleteAll();
}
