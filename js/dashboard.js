/* ============================================================
   DASHBOARD — Logic utama halaman dashboard admin
   ============================================================ */

import { auth, db } from './firebase.js';
import { logoutAdmin } from './auth.js';
import { showToast, showLoading, formatDate, formatTime, debounce, escapeHtml } from './utils.js';
import { loadSettings, generateNewToken, getSettings, initSettingsListener } from './token.js';
import { initQR, updateQR } from './qrcode-gen.js';
import { exportToExcel } from './export.js';
import { DIVISI_LIST } from './validation.js';

/* ============================================================
   STATE
   ============================================================ */

let attendanceData = [];
let unsubAttendance = null;
let unsubSettings = null;
let countdownTimer = null;
let autoGenTimer = null;
let clockTimer = null;

/* ============================================================
   DOM REFS
   ============================================================ */

const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.currentUser) {
        window.location.href = 'index.html';
        return;
    }

    showLoading(true);

    try {
        loadSettings();
        initUI();
        initNavigation();

        let settings = getSettings();
        if (!settings.currentToken) {
            await generateNewToken(settings.interval);
            settings = getSettings();
        }

        initTokenDisplay();
        initQR('adminQRCode', settings.currentToken);

        if (settings.autoGenerate) {
            startAutoGenerate(settings.interval);
        }

        unsubSettings = initSettingsListener((s) => {
            onSettingsUpdate(s);
        });

        subscribeAttendance();
        initRealtimeClock();
        initLogoutButtons();
        initExport();
        initClearAll();
    } catch (error) {
        console.error('[Dashboard] Init error:', error);
        showToast('Gagal memuat dashboard', 'error');
    } finally {
        showLoading(false);
        $('dashboardApp').style.display = 'flex';
    }
});

/* ============================================================
   UI INIT
   ============================================================ */

function initUI() {
    const user = auth.currentUser;
    if (user) {
        $('sidebarAdminName').textContent = user.displayName || 'Admin';
        $('sidebarAdminEmail').textContent = user.email || user.username || '';
    }
}

/* ============================================================
   NAVIGATION
   ============================================================ */

function initNavigation() {
    const links = $$('.sidebar-link');
    const pages = $$('.page');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (!page) return;

            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            pages.forEach(p => p.classList.remove('active'));
            const target = $(`page${page.charAt(0).toUpperCase() + page.slice(1)}`);
            if (target) target.classList.add('active');

            $('navbarTitle').textContent = link.textContent.trim();
        });
    });

    const toggle = $('sidebarToggle');
    const sidebar = $('sidebar');
    const overlay = $('sidebarOverlay');

    if (toggle) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });
    }

    $$('[data-page]').forEach(el => {
        if (el.tagName !== 'A') return;
        el.addEventListener('click', (e) => {
            const page = el.dataset.page;
            if (!page) return;
            e.preventDefault();
            const link = document.querySelector(`.sidebar-link[data-page="${page}"]`);
            if (link) link.click();
        });
    });
}

/* ============================================================
   TOKEN DISPLAY
   ============================================================ */

function initTokenDisplay() {
    const settings = getSettings();
    if (settings.currentToken) {
        $('adminTokenDisplay').textContent = settings.currentToken;
    }
    updateCountdown(settings);
}

function onSettingsUpdate(settings) {
    $('adminTokenDisplay').textContent = settings.currentToken;
    updateQR(settings.currentToken);
    updateCountdown(settings);
    updateAutoGenUI(settings);

    if (settings.autoGenerate && settings.currentToken) {
        startAutoGenerate(settings.interval);
    } else {
        stopAutoGenerate();
    }
}

function updateCountdown(settings) {
    if (countdownTimer) clearInterval(countdownTimer);

    const expiredAt = settings.expiredAt || Date.now();
    const text = $('adminCountdownText');

    function tick() {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiredAt - now) / 1000));

        if (text) text.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(countdownTimer);
        }
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
}

/* ============================================================
   AUTO GENERATE
   ============================================================ */

function startAutoGenerate(interval) {
    stopAutoGenerate();
    if (!interval || interval <= 0) return;

    const settings = getSettings();
    const expiredAt = settings.expiredAt || Date.now();
    const delay = Math.max(0, expiredAt - Date.now());

    autoGenTimer = setTimeout(async () => {
        try {
            const s = getSettings();
            if (s.autoGenerate) {
                await generateNewToken(s.interval);
            }
        } catch (error) {
            console.error('[Dashboard] Auto generate error:', error);
        }
    }, delay + 500);
}

function stopAutoGenerate() {
    if (autoGenTimer) {
        clearTimeout(autoGenTimer);
        autoGenTimer = null;
    }
}

/* ============================================================
   GENERATE BUTTON
   ============================================================ */

$('generateTokenBtn')?.addEventListener('click', async () => {
    try {
        $('generateTokenBtn').disabled = true;
        $('generateTokenBtn').innerHTML = '<i class="bi bi-arrow-repeat"></i> Mengganti...';
        const token = await generateNewToken();
        showToast(`Token baru: ${token}`, 'success');
    } catch (error) {
        showToast('Gagal generate token', 'error');
    } finally {
        $('generateTokenBtn').disabled = false;
        $('generateTokenBtn').innerHTML = '<i class="bi bi-arrow-clockwise"></i> Generate Baru';
    }
});

/* ============================================================
   AUTO GEN UI
   ============================================================ */

function updateAutoGenUI(settings) {
    const badge = $('tokenStatusBadge');
    if (!badge) return;
    if (settings.autoGenerate) {
        badge.className = 'badge badge-success';
        badge.innerHTML = '<i class="bi bi-check-circle-fill"></i> Auto';
    } else {
        badge.className = 'badge badge-warning';
        badge.innerHTML = '<i class="bi bi-pause-circle-fill"></i> Manual';
    }
}

/* ============================================================
   ATTENDANCE REALTIME
   ============================================================ */

function subscribeAttendance() {
    if (unsubAttendance) unsubAttendance();

    unsubAttendance = db.attendance.onSnapshot((data) => {
        attendanceData = data || [];
        updateStats();
        renderRecentTable();
        renderFullTable(
            document.getElementById('searchInput')?.value || '',
            document.getElementById('filterDivisi')?.value || ''
        );
        renderChart();
    });
}

/* ============================================================
   STATS
   ============================================================ */

function updateStats() {
    const total = attendanceData.length;
    const unique = new Set(attendanceData.map(d => d.nim)).size;
    const divisiSet = new Set(attendanceData.map(d => d.divisi));
    const totalDivisi = DIVISI_LIST.length;
    const belumHadir = Math.max(0, totalDivisi - divisiSet.size);

    $('statHadir').textContent = unique;
    $('statBelum').textContent = belumHadir;
    $('statTotal').textContent = total;
    $('statDivisi').textContent = divisiSet.size;
}

/* ============================================================
   RECENT TABLE
   ============================================================ */

function renderRecentTable() {
    const tbody = $('recentBody');
    if (!tbody) return;

    const sorted = [...attendanceData].sort((a, b) => b.createdAt - a.createdAt);
    const recent = sorted.slice(0, 5);

    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:24px;">Belum ada presensi</td></tr>';
        return;
    }

    tbody.innerHTML = recent.map((d, i) => {
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(d.nama || '-')}</strong></td>
            <td>${escapeHtml(d.divisi || '-')}</td>
            <td>${formatTime(d.createdAt)}</td>
        </tr>`;
    }).join('');
}

/* ============================================================
   FULL TABLE
   ============================================================ */

function renderFullTable(searchText = '', divisiFilter = '') {
    const tbody = $('attendanceBody');
    const empty = $('tableEmpty');
    if (!tbody) return;

    let data = db.attendance.query({ search: searchText, divisi: divisiFilter });
    data.sort((a, b) => b.createdAt - a.createdAt);

    if (data.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = data.map((d, i) => {
        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(d.nama || '-')}</strong></td>
            <td>${escapeHtml(d.nim || '-')}</td>
            <td>${escapeHtml(d.divisi || '-')}</td>
            <td style="font-family:monospace;font-weight:600;color:var(--maroon)">${escapeHtml(d.token || '-')}</td>
            <td>${formatDate(d.createdAt)}</td>
            <td>${formatTime(d.createdAt)}</td>
            <td><span class="badge badge-success">Hadir</span></td>
        </tr>`;
    }).join('');
}

/* ============================================================
   CHART
   ============================================================ */

function renderChart() {
    const container = $('chartContainer');
    if (!container) return;

    const divisiCount = {};
    attendanceData.forEach(d => {
        const div = d.divisi || 'Lainnya';
        divisiCount[div] = (divisiCount[div] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(divisiCount), 1);

    if (Object.keys(divisiCount).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-bar-chart"></i>
                <h3>Belum ada data</h3>
                <p>Data presensi akan muncul di sini</p>
            </div>`;
        return;
    }

    const sorted = Object.entries(divisiCount).sort((a, b) => b[1] - a[1]);

    container.innerHTML = sorted.map(([div, count]) => `
        <div class="chart-bar">
            <div class="chart-bar-header">
                <span class="chart-bar-label">${escapeHtml(div)}</span>
                <span class="chart-bar-value">${count}</span>
            </div>
            <div class="chart-bar-track">
                <div class="chart-bar-fill" style="width:${(count / maxCount) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

/* ============================================================
   SEARCH & FILTER
   ============================================================ */

const searchInput = $('searchInput');
const filterDivisi = $('filterDivisi');

if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
        renderFullTable(searchInput.value, filterDivisi?.value || '');
    }, 300));
}

if (filterDivisi) {
    filterDivisi.addEventListener('change', () => {
        renderFullTable(searchInput?.value || '', filterDivisi.value);
    });
}

/* ============================================================
   REALTIME CLOCK
   ============================================================ */

function initRealtimeClock() {
    const clock = $('realtimeClock');
    if (!clock) return;

    function tick() {
        clock.textContent = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    tick();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(tick, 1000);
}

/* ============================================================
   LOGOUT
   ============================================================ */

function initLogoutButtons() {
    $('logoutBtn')?.addEventListener('click', logoutAdmin);
    $('logoutBtnNav')?.addEventListener('click', logoutAdmin);
}

/* ============================================================
   EXPORT
   ============================================================ */

function initExport() {
    $('exportExcelBtn')?.addEventListener('click', exportToExcel);
}

/* ============================================================
   CLEAR ALL
   ============================================================ */

function initClearAll() {
    $('clearAllBtn')?.addEventListener('click', async () => {
        const { showModal } = await import('./utils.js');
        showModal('Hapus Semua Presensi', 'Semua data presensi akan dihapus permanen. Yakin?', 'Hapus', async () => {
            try {
                showLoading(true);
                const { clearAllAttendance } = await import('./token.js');
                clearAllAttendance();
                showToast('Semua data presensi berhasil dihapus', 'success');
            } catch (error) {
                showToast('Gagal menghapus data', 'error');
            } finally {
                showLoading(false);
            }
        });
    });
}
