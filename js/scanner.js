/* ============================================================
   QR SCANNER — Scan QR Code menggunakan html5-qrcode
   ============================================================
   Menggunakan library global: Html5Qrcode (dari CDN)
   ============================================================ */

import { showToast } from './utils.js';

let html5QrCode = null;
let isScanning = false;

/**
 * Inisialisasi scanner QR.
 * @param {string} elementId - ID elemen container
 * @param {Function} onScan - Callback saat QR terdeteksi (token: string)
 */
export async function initScanner(elementId, onScan) {
    const container = document.getElementById(elementId);
    if (!container) {
        console.warn('[Scanner] Container tidak ditemukan:', elementId);
        return;
    }

    if (typeof Html5Qrcode === 'undefined') {
        showToast('Library scanner tidak tersedia. Periksa koneksi.', 'error');
        return;
    }

    try {
        html5QrCode = new Html5Qrcode(elementId);

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            showToast('Tidak ada kamera ditemukan', 'error');
            return;
        }

        const cameraId = cameras.length > 1 ? cameras[1].id : cameras[0].id;

        await html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 200, height: 200 },
            },
            (decodedText) => {
                if (typeof onScan === 'function') {
                    onScan(decodedText);
                }
                stopScanner();
            },
            () => {}
        );

        isScanning = true;
        return true;
    } catch (error) {
        console.error('[Scanner] Gagal inisialisasi:', error);
        showToast('Gagal mengakses kamera: ' + error.message, 'error');
        return false;
    }
}

/**
 * Hentikan scanner.
 */
export async function stopScanner() {
    if (html5QrCode && isScanning) {
        try {
            await html5QrCode.stop();
            html5QrCode.clear();
        } catch (error) {
            console.error('[Scanner] Gagal berhenti:', error);
        }
        isScanning = false;
    }
}

/**
 * Status scanner.
 * @returns {boolean}
 */
export function getScannerStatus() {
    return isScanning;
}
