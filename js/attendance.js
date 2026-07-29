/* ============================================================
   ATTENDANCE — Logic halaman presensi peserta
   ============================================================ */

import { auth, db, serverTimestamp } from './firebase.js';
import { showToast, showLoading, escapeHtml } from './utils.js';
import { validateForm, validateToken, isAlreadyAttend } from './validation.js';
import { initScanner, stopScanner } from './scanner.js';
import { loadSettings, getSettings, initSettingsListener } from './token.js';

/* ============================================================
   DOM REFS
   ============================================================ */

const $ = (id) => document.getElementById(id);

const form = $('attendanceForm');
const namaInput = $('nama');
const nimInput = $('nim');
const divisiInput = $('divisi');
const tokenInput = $('token');
const presensiBtn = $('presensiBtn');
const scanBtn = $('scanBtn');
const stopScanBtn = $('stopScanBtn');
const scannerPlaceholder = $('scannerPlaceholder');
const scannerResult = $('scannerResult');
const scannedToken = $('scannedToken');
const successState = $('successState');
const successMessage = $('successMessage');
const resetFormBtn = $('resetFormBtn');

/* ============================================================
   INIT
   ============================================================ */

let unsubSettings = null;
let settingsReady = false;
let latestSettings = null;
let settingsTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadSettings();

        presensiBtn.disabled = true;
        presensiBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Memuat token...';

        unsubSettings = initSettingsListener((settings) => {
            settingsReady = true;
            latestSettings = settings;
            if (settingsTimeout) clearTimeout(settingsTimeout);
            presensiBtn.disabled = false;
            presensiBtn.innerHTML = '<i class="bi bi-check-lg"></i> Presensi';
            const activeToken = settings.currentToken;
            if (activeToken) {
                $('tokenError').textContent = '';
            }
        });

        settingsTimeout = setTimeout(() => {
            if (!settingsReady) {
                presensiBtn.disabled = false;
                presensiBtn.innerHTML = '<i class="bi bi-check-lg"></i> Presensi';
                showToast('Tidak dapat terhubung ke server. Periksa koneksi Anda.', 'error');
            }
        }, 15000);

        const user = auth.currentUser;
        if (user && user.role === 'user') {
            if (namaInput) {
                namaInput.value = user.displayName || '';
                namaInput.readOnly = true;
            }
            if (nimInput) {
                nimInput.value = user.nim || '';
                nimInput.readOnly = true;
            }
        }

        initFormValidation();
        initScanButtons();
        initResetButton();
        initScannerClick();
    } catch (error) {
        console.error('[Attendance] Init error:', error);
    }
});

/* ============================================================
   FORM VALIDATION
   ============================================================ */

function initFormValidation() {
    namaInput?.addEventListener('blur', () => {
        const err = $('namaError');
        err.textContent = namaInput.value.trim() ? '' : 'Nama harus diisi';
    });

    nimInput?.addEventListener('blur', () => {
        const err = $('nimError');
        const val = nimInput.value.trim();
        if (!val) err.textContent = 'NIM harus diisi';
        else if (!/^\d+$/.test(val)) err.textContent = 'NIM hanya boleh angka';
        else err.textContent = '';
    });

    nimInput?.addEventListener('input', () => {
        nimInput.value = nimInput.value.replace(/[^0-9]/g, '');
    });

    tokenInput?.addEventListener('input', () => {
        tokenInput.value = tokenInput.value.replace(/[^0-9]/g, '').slice(0, 6);
        $('tokenError').textContent = '';
    });

    form?.addEventListener('submit', handleSubmit);
}

/* ============================================================
   SUBMIT
   ============================================================ */

async function handleSubmit(e) {
    e.preventDefault();

    const nama = namaInput.value.trim();
    const nim = nimInput.value.trim();
    const divisi = divisiInput.value;
    const token = tokenInput.value.trim();

    const { valid, errors } = validateForm(nama, nim, divisi);
    $('namaError').textContent = errors.nama || '';
    $('nimError').textContent = errors.nim || '';
    $('divisiError').textContent = errors.divisi || '';

    if (!valid) {
        showToast('Harap periksa kembali data Anda', 'error');
        return;
    }

    if (!token) {
        $('tokenError').textContent = 'Token harus diisi';
        showToast('Scan QR Code atau masukkan token manual', 'error');
        return;
    }

    presensiBtn.disabled = true;
    presensiBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Memproses...';
    showLoading(true);

    try {
        const tokenResult = validateToken(token, latestSettings);
        if (!tokenResult.valid) {
            $('tokenError').textContent = tokenResult.message;
            showToast(tokenResult.message, 'error');
            presensiBtn.disabled = false;
            presensiBtn.innerHTML = '<i class="bi bi-check-lg"></i> Presensi';
            showLoading(false);
            return;
        }

        const already = isAlreadyAttend(nim);
        if (already) {
            $('nimError').textContent = 'NIM ini sudah melakukan presensi';
            showToast('NIM sudah tercatat', 'error');
            presensiBtn.disabled = false;
            presensiBtn.innerHTML = '<i class="bi bi-check-lg"></i> Presensi';
            showLoading(false);
            return;
        }

        db.attendance.add({
            nama,
            nim,
            divisi,
            token,
            status: 'Hadir',
        });

        form.style.display = 'none';
        successState.style.display = 'block';
        successMessage.textContent = `Selamat datang, ${escapeHtml(nama)}! Presensi Anda telah tercatat.`;

        showToast('Presensi berhasil!', 'success');
    } catch (error) {
        console.error('[Attendance] Submit error:', error);
        showToast('Gagal menyimpan presensi: ' + error.message, 'error');
    } finally {
        presensiBtn.disabled = false;
        presensiBtn.innerHTML = '<i class="bi bi-check-lg"></i> Presensi';
        showLoading(false);
    }
}

/* ============================================================
   SCANNER
   ============================================================ */

function initScanButtons() {
    scanBtn?.addEventListener('click', startScanning);
    stopScanBtn?.addEventListener('click', stopScanning);
}

function initScannerClick() {
    scannerPlaceholder?.addEventListener('click', startScanning);
}

async function startScanning() {
    try {
        scanBtn.style.display = 'none';
        stopScanBtn.style.display = '';
        scannerPlaceholder.style.display = 'none';

        const started = await initScanner('scannerContainer', handleScanResult);

        if (!started) {
            scanBtn.style.display = '';
            stopScanBtn.style.display = 'none';
            scannerPlaceholder.style.display = 'flex';
        }
    } catch (error) {
        console.error('[Attendance] Scan start error:', error);
        scanBtn.style.display = '';
        stopScanBtn.style.display = 'none';
        scannerPlaceholder.style.display = 'flex';
    }
}

async function stopScanning() {
    try {
        await stopScanner();
    } catch (error) {
        console.error('[Attendance] Scan stop error:', error);
    }

    scanBtn.style.display = '';
    stopScanBtn.style.display = 'none';
    scannerPlaceholder.style.display = 'flex';
    scannerResult.style.display = 'none';
}

function handleScanResult(token) {
    const cleaned = token.trim().replace(/[^0-9]/g, '').slice(0, 6);

    tokenInput.value = cleaned;
    $('tokenError').textContent = '';

    scannerResult.style.display = 'flex';
    scannedToken.textContent = cleaned;

    scannerPlaceholder.innerHTML = `
        <i class="bi bi-check-circle-fill" style="color:var(--success);font-size:48px;"></i>
        <p style="color:var(--success);font-weight:600;">QR Terdeteksi!</p>
    `;
    scannerPlaceholder.style.display = 'flex';

    showToast('QR Code berhasil discan!', 'success');
}

/* ============================================================
   RESET FORM
   ============================================================ */

function initResetButton() {
    resetFormBtn?.addEventListener('click', () => {
        form.reset();
        form.style.display = '';
        successState.style.display = 'none';
        scannerResult.style.display = 'none';
        scannerPlaceholder.innerHTML = `<i class="bi bi-camera-fill"></i><p>Klik untuk scan QR Code</p>`;
        scannerPlaceholder.style.display = 'flex';
        $('tokenError').textContent = '';
        $('namaError').textContent = '';
        $('nimError').textContent = '';
        $('divisiError').textContent = '';
    });
}
