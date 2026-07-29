/* ============================================================
   EXPORT — Export data presensi ke Excel (SheetJS)
   ============================================================ */

import { db } from './firebase.js';
import { showToast, showLoading, formatDateOnly, formatTime, escapeHtml, getIndonesianFullDate } from './utils.js';

/**
 * Export seluruh data attendance ke file Excel.
 */
export async function exportToExcel() {
    showLoading(true);

    try {
        if (typeof XLSX === 'undefined') {
            showToast('Library Excel tidak tersedia. Periksa koneksi.', 'error');
            showLoading(false);
            return;
        }

        const data = db.attendance.getSorted('asc');

        if (data.length === 0) {
            showToast('Tidak ada data untuk di-export', 'warning');
            showLoading(false);
            return;
        }

        const rows = data.map((d, index) => ({
            No: index + 1,
            Nama: d.nama || '-',
            NIM: d.nim || '-',
            Divisi: d.divisi || '-',
            Token: d.token || '-',
            Tanggal: formatDateOnly(d.createdAt),
            Jam: formatTime(d.createdAt),
            Status: d.status || 'Hadir',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        ws['!cols'] = [
            { wch: 5 },
            { wch: 30 },
            { wch: 18 },
            { wch: 20 },
            { wch: 10 },
            { wch: 18 },
            { wch: 12 },
            { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Presensi MUBES XXI');

        const dateInfo = getIndonesianFullDate();
        const filename = `Presensi_MUBES_XXI_${dateInfo.fileDate}.xlsx`;

        XLSX.writeFile(wb, filename);
        showToast(`File berhasil diunduh: ${filename}`, 'success');
    } catch (error) {
        console.error('[Export] Gagal export:', error);
        showToast('Gagal export data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
