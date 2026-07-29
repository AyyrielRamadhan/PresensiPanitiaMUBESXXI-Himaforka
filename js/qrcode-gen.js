/* ============================================================
   QR CODE GENERATOR — Membuat QR Code dari token
   ============================================================
   Menggunakan library global: QRCode (dari qrcode.js CDN)
   ============================================================ */

let qrInstance = null;

/**
 * Inisialisasi QR Code di container.
 * @param {string|HTMLElement} containerId - ID elemen atau elemen DOM
 * @param {string} token - Token yang akan di-encode
 */
export function initQR(containerId, token) {
    const container = typeof containerId === 'string'
        ? document.getElementById(containerId)
        : containerId;

    if (!container) {
        console.warn('[QR] Container tidak ditemukan:', containerId);
        return;
    }

    container.innerHTML = '';

    if (typeof QRCode === 'undefined') {
        container.innerHTML = '<p style="color:var(--gray-400);font-size:13px;">Memuat QR Code...</p>';
        return;
    }

    try {
        qrInstance = new QRCode(container, {
            text: token || '------',
            width: 180,
            height: 180,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
        });
    } catch (error) {
        console.error('[QR] Gagal inisialisasi:', error);
        container.innerHTML = '<p style="color:var(--gray-400);font-size:13px;">Gagal memuat QR Code</p>';
    }
}

/**
 * Update QR Code dengan token baru.
 * @param {string} token
 */
export function updateQR(token) {
    if (qrInstance) {
        try {
            qrInstance.clear();
            qrInstance.makeCode(token || '------');
        } catch (error) {
            console.error('[QR] Gagal update:', error);
        }
    }
}

/**
 * Generate QR Code baru di container (destroy previous).
 * @param {string|HTMLElement} containerId
 * @param {string} token
 */
export function regenerateQR(containerId, token) {
    qrInstance = null;
    initQR(containerId, token);
}
