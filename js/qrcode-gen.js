/* ============================================================
   QR CODE GENERATOR — Membuat QR Code dari token
   ============================================================
   Menggunakan library global: QRCode (dari qrcode.js CDN)
   ============================================================ */

let mainQrInstance = null;
const instancesMap = new Map();

/**
 * Inisialisasi QR Code di container.
 * @param {string|HTMLElement} containerId - ID elemen atau elemen DOM
 * @param {string} token - Token yang akan di-encode
 * @param {number} size - Ukuran piksel QR (default 180)
 */
export function initQR(containerId, token, size = 180) {
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
        const instance = new QRCode(container, {
            text: token || '------',
            width: size,
            height: size,
            colorDark: '#0f172a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
        });

        const key = typeof containerId === 'string' ? containerId : container.id || 'default';
        instancesMap.set(key, instance);
        if (key === 'adminQRCode') {
            mainQrInstance = instance;
        }
        return instance;
    } catch (error) {
        console.error('[QR] Gagal inisialisasi:', error);
        container.innerHTML = '<p style="color:var(--gray-400);font-size:13px;">Gagal memuat QR Code</p>';
    }
}

/**
 * Update seluruh QR Code yang terdaftar dengan token baru.
 * @param {string} token
 */
export function updateQR(token) {
    instancesMap.forEach((instance) => {
        try {
            instance.clear();
            instance.makeCode(token || '------');
        } catch (error) {
            console.error('[QR] Gagal update instance:', error);
        }
    });
}

/**
 * Generate QR Code baru di container.
 * @param {string|HTMLElement} containerId
 * @param {string} token
 * @param {number} size
 */
export function regenerateQR(containerId, token, size = 180) {
    initQR(containerId, token, size);
}
