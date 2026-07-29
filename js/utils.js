/* ============================================================
   UTILS — Fungsi bantu (toast, modal, loading, format, dll)
   ============================================================ */

/**
 * Menampilkan toast notification.
 * @param {string} message - Pesan yang ditampilkan
 * @param {'success'|'error'|'warning'|'info'} type - Tipe toast
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        document.body.appendChild(div);
    }
    const c = document.getElementById('toastContainer');

    const icons = {
        success: 'bi-check-circle-fill',
        error: 'bi-exclamation-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        info: 'bi-info-circle-fill',
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i> ${message}`;
    c.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Menampilkan modal konfirmasi.
 * @param {string} title - Judul modal
 * @param {string} message - Pesan modal
 * @param {string} confirmText - Teks tombol konfirmasi
 * @param {Function} onConfirm - Callback saat dikonfirmasi
 */
export function showModal(title, message, confirmText = 'Ya', onConfirm) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="btn btn-outline btn-cancel-modal">Batal</button>
                <button class="btn btn-primary btn-confirm-modal">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.btn-cancel-modal').addEventListener('click', () => {
        overlay.remove();
    });

    overlay.querySelector('.btn-confirm-modal').addEventListener('click', () => {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

/**
 * Menampilkan atau menyembunyikan loading overlay.
 * @param {boolean} show
 */
export function showLoading(show = true) {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = show ? 'flex' : 'none';
}

/**
 * Format tanggal ke string lokal Indonesia.
 * @param {Date|string|number} date
 * @param {boolean} withTime
 * @returns {string}
 */
export function formatDate(date, withTime = true) {
    const d = new Date(date);
    const opts = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime && { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    return d.toLocaleDateString('id-ID', opts);
}

/**
 * Format waktu saja.
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Format tanggal saja.
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatDateOnly(date) {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Debounce function.
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Generate ID unik sederhana.
 * @returns {string}
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Escape HTML untuk mencegah XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Mengembalikan tanggal lengkap Indonesia (Hari, Tanggal Bulan Tahun).
 * Contoh: { fileDate: "Rabu_29_Juli_2026", displayDate: "Rabu, 29 Juli 2026" }
 */
export function getIndonesianFullDate(date = new Date()) {
    const d = new Date(date);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[d.getDay()];
    const dateNum = d.getDate();
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();

    return {
        fileDate: `${dayName}_${dateNum}_${monthName}_${year}`,
        displayDate: `${dayName}, ${dateNum} ${monthName} ${year}`
    };
}
