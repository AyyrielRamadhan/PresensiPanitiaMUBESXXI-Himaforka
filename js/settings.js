/* ============================================================
   SETTINGS — Pengaturan token (interval, auto-generate)
   ============================================================ */

import { showToast } from './utils.js';
import { setInterval_, setAutoGenerate, getSettings, loadSettings } from './token.js';

/* ============================================================
   DOM REFS
   ============================================================ */

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    initIntervalButtons();
    initAutoGenerateToggle();
});

/* ============================================================
   INTERVAL BUTTONS
   ============================================================ */

function initIntervalButtons() {
    const btns = $$('.interval-btn');
    const settings = getSettings();

    /* Set active from current settings */
    btns.forEach(btn => {
        const interval = parseInt(btn.dataset.interval, 10);
        if (interval === settings.interval) {
            btn.classList.add('active');
        }
    });

    btns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const interval = parseInt(btn.dataset.interval, 10);

            try {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                await setInterval_(interval);
                showToast(`Interval token diubah menjadi ${interval} detik`, 'success');
            } catch (error) {
                console.error('[Settings] Gagal ubah interval:', error);
                showToast('Gagal mengubah interval', 'error');
            }
        });
    });
}

/* ============================================================
   AUTO GENERATE TOGGLE
   ============================================================ */

function initAutoGenerateToggle() {
    const toggle = $('autoGenerateToggle');
    const status = $('autoGenerateStatus');
    if (!toggle || !status) return;

    const settings = getSettings();
    toggle.checked = settings.autoGenerate;
    status.textContent = settings.autoGenerate ? 'Aktif' : 'Nonaktif';

    toggle.addEventListener('change', async () => {
        const enabled = toggle.checked;

        try {
            await setAutoGenerate(enabled);
            status.textContent = enabled ? 'Aktif' : 'Nonaktif';
            showToast(enabled ? 'Auto-generate diaktifkan' : 'Auto-generate dinonaktifkan', 'success');
        } catch (error) {
            console.error('[Settings] Gagal toggle auto:', error);
            toggle.checked = !enabled;
            status.textContent = !enabled ? 'Aktif' : 'Nonaktif';
            showToast('Gagal mengubah pengaturan', 'error');
        }
    });
}
