/* ============================================================
   DASHBOARD — Logic utama halaman dashboard admin
   ============================================================ */

import { auth, db } from './firebase.js';
import { logoutAdmin } from './auth.js';
import { showToast, showLoading, formatDate, formatTime, debounce, escapeHtml, getIndonesianFullDate } from './utils.js';
import { loadSettings, generateNewToken, getSettings, initSettingsListener } from './token.js';
import { initQR, updateQR } from './qrcode-gen.js';
import { exportToExcel } from './export.js';
import { DIVISI_LIST, MASTER_PANITIA, findPanitiaByNim, getPanitiaBelumHadir } from './validation.js';

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

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
    ]);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.currentUser) {
        window.location.href = 'index.html';
        return;
    }

    if (auth.currentUser.role !== 'admin') {
        window.location.href = 'attendance.html';
        return;
    }

    showLoading(true);

    try {
        loadSettings();
        initUI();
        initNavigation();

        let settings = getSettings();
        if (!settings.currentToken) {
            await withTimeout(generateNewToken(settings.interval), 10000);
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

        initStorageModeListener();
        subscribeAttendance();
        initRealtimeClock();
        initLogoutButtons();
        initExport();
        initClearAll();
        initAdminManualAdd();
        initStatCardsClick();
        initPrintReport();
    } catch (error) {
        console.error('[Dashboard] Init error:', error);
        showToast('Gagal memuat dashboard', 'error');
    } finally {
        showLoading(false);
        $('dashboardApp').style.display = 'flex';
    }
});

function initStorageModeListener() {
    const badge = $('storageModeBadge');
    if (!badge) return;

    db.onStorageModeChange((isCloud) => {
        if (isCloud) {
            badge.className = 'badge badge-success';
            badge.style.marginRight = '8px';
            badge.innerHTML = '<i class="bi bi-cloud-check-fill"></i> Cloud Sync';
        } else {
            badge.className = 'badge badge-warning';
            badge.style.marginRight = '8px';
            badge.innerHTML = '<i class="bi bi-hdd-fill"></i> Local Storage';
        }
    });
}

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
        if ($('modalTokenDisplay')) $('modalTokenDisplay').textContent = settings.currentToken;
    }
    updateCountdown(settings);
    initQRModal();
}

export function openQRModal() {
    const modal = $('qrModal');
    if (!modal) return;

    const settings = getSettings();
    modal.style.display = 'flex';
    if ($('modalTokenDisplay')) $('modalTokenDisplay').textContent = settings.currentToken || '------';
    
    initQR('modalQRCode', settings.currentToken, 280);
}

export function closeQRModal() {
    const modal = $('qrModal');
    if (modal) modal.style.display = 'none';
}

window.openQRModal = openQRModal;
window.closeQRModal = closeQRModal;

function initQRModal() {
    const qrCard = $('qrCard');
    const modal = $('qrModal');
    const closeBtn = $('qrModalClose');
    if (!modal) return;

    if (qrCard) {
        qrCard.addEventListener('click', openQRModal);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeQRModal);
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeQRModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeQRModal();
        }
    });
}

function onSettingsUpdate(settings) {
    $('adminTokenDisplay').textContent = settings.currentToken;
    if ($('modalTokenDisplay')) $('modalTokenDisplay').textContent = settings.currentToken;
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
    const modalText = $('modalCountdownText');

    function tick() {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiredAt - now) / 1000));

        if (text) text.textContent = remaining;
        if (modalText) modalText.textContent = remaining;

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
   ATTENDANCE REALTIME & SOUND
   ============================================================ */

let prevAttendanceCount = -1;

function playChimeSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.12);
        osc2.frequency.exponentialRampToValueAtTime(783.99, now + 0.35);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.15);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.45);
    } catch (e) {
        console.warn('[Sound] Web Audio API notice:', e);
    }
}

function subscribeAttendance() {
    if (unsubAttendance) unsubAttendance();

    unsubAttendance = db.attendance.onSnapshot((data) => {
        const newData = data || [];
        if (prevAttendanceCount >= 0 && newData.length > prevAttendanceCount) {
            playChimeSound();
            showToast('Presensi baru tercatat!', 'info');
        }
        prevAttendanceCount = newData.length;
        attendanceData = newData;

        updateStats();
        renderRecentTable();
        renderFullTable(
            document.getElementById('searchInput')?.value || '',
            document.getElementById('filterDivisi')?.value || '',
            document.getElementById('filterStatus')?.value || ''
        );
        renderPanitiaTables();
        renderChart();
    });
}

/* ============================================================
   STATS
   ============================================================ */

const TOTAL_PANITIA = 20;

function updateStats() {
    const hadir = new Set(attendanceData.map(d => d.nim)).size;
    const belumHadir = Math.max(0, TOTAL_PANITIA - hadir);

    $('statHadir').textContent = hadir;
    $('statBelum').textContent = belumHadir;
    $('statTotal').textContent = TOTAL_PANITIA;
    $('statDivisi').textContent = DIVISI_LIST.length;

    if ($('printStatHadir')) $('printStatHadir').textContent = hadir;
    if ($('printStatBelum')) $('printStatBelum').textContent = belumHadir;
    if ($('printStatTotal')) $('printStatTotal').textContent = TOTAL_PANITIA;
    if ($('printStatDivisi')) $('printStatDivisi').textContent = DIVISI_LIST.length;
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
   FULL TABLE WITH HADIR & BELUM HADIR
   ============================================================ */

function renderFullTable(searchText = '', divisiFilter = '', statusFilter = '') {
    const tbody = $('attendanceBody');
    const empty = $('tableEmpty');
    if (!tbody) return;

    const attendedNims = new Set(attendanceData.map(d => String(d.nim).trim()));
    const attendedList = attendanceData.map(d => ({ ...d, isPresent: true, status: 'Hadir' }));
    
    const unattendedMaster = MASTER_PANITIA.filter(p => !attendedNims.has(p.nim)).map(p => ({
        id: 'unattended-' + p.nim,
        nama: p.nama,
        nim: p.nim,
        divisi: p.divisi,
        token: '-',
        createdAt: null,
        isPresent: false,
        status: 'Belum Hadir',
    }));

    let combined = [...attendedList, ...unattendedMaster];

    if (searchText) {
        const s = searchText.toLowerCase().trim();
        combined = combined.filter(d => 
            (d.nama && d.nama.toLowerCase().includes(s)) ||
            (d.nim && d.nim.toLowerCase().includes(s))
        );
    }

    if (divisiFilter) {
        combined = combined.filter(d => d.divisi === divisiFilter);
    }

    if (statusFilter) {
        combined = combined.filter(d => d.status === statusFilter);
    }

    combined.sort((a, b) => {
        if (a.isPresent && !b.isPresent) return -1;
        if (!a.isPresent && b.isPresent) return 1;
        if (a.isPresent && b.isPresent) return (b.createdAt || 0) - (a.createdAt || 0);
        return a.nama.localeCompare(b.nama);
    });

    if (combined.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = combined.map((d, i) => {
        const isPresent = d.isPresent;
        const statusBadge = isPresent
            ? '<span class="badge badge-success">Hadir</span>'
            : '<span class="badge badge-danger">Belum Hadir</span>';

        const actionBtn = isPresent
            ? `<button class="btn btn-danger btn-sm btn-delete-row" data-id="${d.id}" data-nama="${escapeHtml(d.nama || '')}" title="Hapus presensi ini" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-trash"></i>
               </button>`
            : `<button class="btn btn-primary btn-sm btn-mark-present" data-nim="${d.nim}" data-nama="${escapeHtml(d.nama)}" data-divisi="${escapeHtml(d.divisi)}" title="Tandai Hadir Manual" style="padding:4px 8px;font-size:12px">
                <i class="bi bi-check-lg"></i> Presensikan
               </button>`;

        return `<tr>
            <td>${i + 1}</td>
            <td><strong>${escapeHtml(d.nama || '-')}</strong></td>
            <td>${escapeHtml(d.nim || '-')}</td>
            <td>${escapeHtml(d.divisi || '-')}</td>
            <td style="font-family:monospace;font-weight:600;color:var(--maroon)">${escapeHtml(d.token || '-')}</td>
            <td>${d.createdAt ? formatDate(d.createdAt) : '-'}</td>
            <td>${d.createdAt ? formatTime(d.createdAt) : '-'}</td>
            <td>${statusBadge}</td>
            <td class="no-print">${actionBtn}</td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-delete-row').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const nama = btn.dataset.nama;
            const { showModal } = import('./utils.js').then(({ showModal }) => {
                showModal('Hapus Presensi', `Yakin ingin menghapus presensi ${nama}?`, 'Hapus', async () => {
                    try {
                        await db.attendance.deleteById(id);
                        showToast(`Presensi ${nama} berhasil dihapus`, 'success');
                    } catch (err) {
                        showToast('Gagal menghapus presensi', 'error');
                    }
                });
            });
        });
    });

    tbody.querySelectorAll('.btn-mark-present').forEach(btn => {
        btn.addEventListener('click', async () => {
            const nim = btn.dataset.nim;
            const nama = btn.dataset.nama;
            const divisi = btn.dataset.divisi;

            try {
                showLoading(true);
                await db.attendance.add({
                    nama,
                    nim,
                    divisi,
                    token: 'ADMIN',
                    status: 'Hadir',
                });
                showToast(`Presensi ${nama} berhasil ditandai hadir!`, 'success');
            } catch (err) {
                showToast('Gagal memproses presensi', 'error');
            } finally {
                showLoading(false);
            }
        });
    });
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
const filterStatus = $('filterStatus');

function triggerTableRender() {
    renderFullTable(
        searchInput?.value || '',
        filterDivisi?.value || '',
        filterStatus?.value || ''
    );
}

if (searchInput) {
    searchInput.addEventListener('input', debounce(triggerTableRender, 300));
}

if (filterDivisi) {
    filterDivisi.addEventListener('change', triggerTableRender);
}

if (filterStatus) {
    filterStatus.addEventListener('change', triggerTableRender);
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

/* ============================================================
   ADMIN MANUAL ADD ATTENDANCE
   ============================================================ */

function initAdminManualAdd() {
    const btn = $('addAttendanceBtn');
    const modal = $('addAttendanceModal');
    const closeBtn = $('closeAddModalBtn');
    const cancelBtn = $('cancelAddModalBtn');
    const form = $('adminAddForm');

    if (!modal || !form) return;

    function openAddModal() {
        form.reset();
        modal.style.display = 'flex';
    }

    function closeAddModal() {
        modal.style.display = 'none';
    }

    btn?.addEventListener('click', openAddModal);
    closeBtn?.addEventListener('click', closeAddModal);
    cancelBtn?.addEventListener('click', closeAddModal);

    $('adminAddNim')?.addEventListener('input', (e) => {
        const val = e.target.value.replace(/[^0-9]/g, '');
        e.target.value = val;
        const match = findPanitiaByNim(val);
        if (match) {
            $('adminAddNama').value = match.nama;
            $('adminAddDivisi').value = match.divisi;
        }
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeAddModal();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = $('adminAddNama').value.trim();
        const nim = $('adminAddNim').value.trim();
        const divisi = $('adminAddDivisi').value;

        if (!nama || !nim || !divisi) {
            showToast('Harap lengkapi semua bidang data', 'error');
            return;
        }

        if (db.attendance.existsByNim(nim)) {
            showToast('NIM ini sudah tercatat presensinya', 'warning');
            return;
        }

        try {
            showLoading(true);
            await db.attendance.add({
                nama,
                nim,
                divisi,
                token: 'ADMIN',
                status: 'Hadir',
            });
            showToast(`Presensi ${nama} berhasil ditambahkan!`, 'success');
            closeAddModal();
        } catch (error) {
            console.error('Add attendance error:', error);
            showToast('Gagal menyimpan presensi', 'error');
        } finally {
            showLoading(false);
        }
    });
}

/* ============================================================
   INTERACTIVE 4 STAT CARDS CLICK HANDLERS
   ============================================================ */

function initStatCardsClick() {
    const statHadirCard = $('statHadirCard');
    const statBelumCard = $('statBelumCard');
    const statTotalCard = $('statTotalCard');
    const statDivisiCard = $('statDivisiCard');

    const modal = $('unattendedModal');
    const closeBtn = $('closeUnattendedModalBtn');
    const okBtn = $('okUnattendedBtn');

    function navigateToPresensi(statusVal = '') {
        const links = document.querySelectorAll('.sidebar-link');
        const pages = document.querySelectorAll('.page');
        
        links.forEach(l => l.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));

        const targetLink = document.querySelector('.sidebar-link[data-page="presensi"]');
        const targetPage = $('pagePresensi');
        const navTitle = $('navbarTitle');

        if (targetLink) targetLink.classList.add('active');
        if (targetPage) targetPage.classList.add('active');
        if (navTitle) navTitle.textContent = 'Riwayat Presensi';

        const filterStatus = $('filterStatus');
        if (filterStatus) {
            filterStatus.value = statusVal;
            triggerTableRender();
        }
    }

    function navigateToPage(pageName) {
        const link = document.querySelector(`.sidebar-link[data-page="${pageName}"]`);
        if (link) link.click();
    }

    statHadirCard?.addEventListener('click', () => {
        navigateToPresensi('Hadir');
    });

    function openUnattendedModal() {
        renderUnattendedContent();
        if (modal) modal.style.display = 'flex';
    }

    function closeUnattendedModal() {
        if (modal) modal.style.display = 'none';
    }

    statBelumCard?.addEventListener('click', openUnattendedModal);
    closeBtn?.addEventListener('click', closeUnattendedModal);
    okBtn?.addEventListener('click', closeUnattendedModal);

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeUnattendedModal();
    });

    statTotalCard?.addEventListener('click', () => {
        navigateToPage('panitia');
    });

    statDivisiCard?.addEventListener('click', () => {
        const chartCard = document.querySelector('.chart-card') || $('chartContainer');
        if (chartCard) {
            chartCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            chartCard.style.transition = 'box-shadow 0.3s ease';
            chartCard.style.boxShadow = '0 0 0 3px var(--maroon)';
            setTimeout(() => {
                chartCard.style.boxShadow = '';
            }, 1500);
        }
    });
}

/* ============================================================
   PAGE: DATA PANITIA (TABLES PER JABATAN / DIVISI)
   ============================================================ */

function renderPanitiaTables() {
    const container = $('panitiaTablesContainer');
    if (!container) return;

    const attendedMap = new Map();
    attendanceData.forEach(d => {
        if (d.nim) attendedMap.set(String(d.nim).trim(), d);
    });

    const grouped = {};
    DIVISI_LIST.forEach(div => grouped[div] = []);

    MASTER_PANITIA.forEach(p => {
        const div = p.divisi || 'Lainnya';
        if (!grouped[div]) grouped[div] = [];
        grouped[div].push(p);
    });

    let html = '';

    DIVISI_LIST.forEach(div => {
        const list = grouped[div] || [];
        if (list.length === 0) return;

        const hadirCount = list.filter(p => attendedMap.has(p.nim)).length;

        html += `
            <div class="card" style="padding:20px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--gray-100);padding-bottom:10px;flex-wrap:wrap;gap:8px">
                    <div style="display:flex;align-items:center;gap:10px">
                        <i class="bi bi-diagram-3-fill" style="color:var(--maroon);font-size:20px"></i>
                        <h4 style="font-size:16px;font-weight:700;color:var(--gray-900);margin:0">${escapeHtml(div)}</h4>
                    </div>
                    <span class="badge ${hadirCount === list.length ? 'badge-success' : 'badge-warning'}" style="font-size:12px;padding:4px 10px">
                        ${hadirCount} / ${list.length} Hadir
                    </span>
                </div>
                <div class="table-container" style="box-shadow:none;border:1px solid var(--gray-200);border-radius:var(--radius-md)">
                    <table class="table">
                        <thead>
                            <tr>
                                <th style="width:50px">No</th>
                                <th>Nama Panitia</th>
                                <th>NIM</th>
                                <th>Jabatan / Divisi</th>
                                <th>Status Kehadiran</th>
                                <th>Waktu Presensi</th>
                                <th class="no-print" style="text-align:right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        html += list.map((p, idx) => {
            const att = attendedMap.get(p.nim);
            const isPresent = !!att;
            const statusBadge = isPresent
                ? '<span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Hadir</span>'
                : '<span class="badge badge-danger"><i class="bi bi-x-circle-fill"></i> Belum Hadir</span>';

            const timeStr = isPresent && att.createdAt
                ? `${formatDate(att.createdAt)} - ${formatTime(att.createdAt)}`
                : '-';

            const actionBtn = isPresent
                ? `<span style="font-size:12px;color:var(--success);font-weight:600"><i class="bi bi-check2-all"></i> Terdaftar</span>`
                : `<button class="btn btn-primary btn-sm btn-panitia-present" data-nim="${p.nim}" data-nama="${escapeHtml(p.nama)}" data-divisi="${escapeHtml(p.divisi)}" style="font-size:12px;padding:4px 10px">
                    <i class="bi bi-check-lg"></i> Hadirkan
                   </button>`;

            const koorTag = p.isKoor ? ' <span class="badge badge-warning" style="font-size:10px;margin-left:4px">Koor</span>' : '';

            return `<tr>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(p.nama)}</strong>${koorTag}</td>
                <td>${escapeHtml(p.nim)}</td>
                <td>${escapeHtml(p.divisi)}</td>
                <td>${statusBadge}</td>
                <td>${timeStr}</td>
                <td class="no-print" style="text-align:right">${actionBtn}</td>
            </tr>`;
        }).join('');

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-panitia-present').forEach(btn => {
        btn.addEventListener('click', async () => {
            const nim = btn.dataset.nim;
            const nama = btn.dataset.nama;
            const divisi = btn.dataset.divisi;

            try {
                showLoading(true);
                await db.attendance.add({
                    nama,
                    nim,
                    divisi,
                    token: 'ADMIN',
                    status: 'Hadir',
                });
                showToast(`Presensi ${nama} berhasil ditandai hadir!`, 'success');
            } catch (err) {
                showToast('Gagal memproses presensi', 'error');
            } finally {
                showLoading(false);
            }
        });
    });
}

function renderUnattendedContent() {
    const container = $('unattendedContent');
    if (!container) return;

    const attendedNims = new Set(attendanceData.map(d => String(d.nim).trim()));
    const unattendedList = MASTER_PANITIA.filter(p => !attendedNims.has(p.nim));
    const totalHadir = attendedNims.size;
    const totalBelum = unattendedList.length;

    let html = `
        <div style="background:var(--gray-50);padding:12px;border-radius:var(--radius-sm);margin-bottom:16px;display:flex;justify-content:space-around;text-align:center">
            <div>
                <span style="font-size:11px;color:var(--gray-500);text-transform:uppercase;font-weight:600">Total Panitia</span>
                <div style="font-size:20px;font-weight:700;color:var(--gray-800)">${TOTAL_PANITIA}</div>
            </div>
            <div>
                <span style="font-size:11px;color:var(--success);text-transform:uppercase;font-weight:600">Sudah Hadir</span>
                <div style="font-size:20px;font-weight:700;color:var(--success)">${totalHadir}</div>
            </div>
            <div>
                <span style="font-size:11px;color:var(--danger);text-transform:uppercase;font-weight:600">Belum Hadir</span>
                <div style="font-size:20px;font-weight:700;color:var(--danger)">${totalBelum}</div>
            </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--gray-700);margin-bottom:10px">Daftar Panitia Belum Hadir (${totalBelum} Orang):</div>
        <div style="display:flex;flex-direction:column;gap:8px">
    `;

    if (unattendedList.length === 0) {
        html += `
            <div style="text-align:center;padding:24px;color:var(--success);font-weight:600">
                <i class="bi bi-check-circle-fill" style="font-size:32px;display:block;margin-bottom:8px"></i>
                Semua panitia (20 Orang) telah hadir 100%!
            </div>
        `;
    } else {
        unattendedList.forEach((p, idx) => {
            html += `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--white);border:1px solid var(--gray-200);border-radius:var(--radius-sm)">
                    <div>
                        <div style="font-weight:600;font-size:14px;color:var(--gray-900)">${idx + 1}. ${escapeHtml(p.nama)}</div>
                        <div style="font-size:12px;color:var(--gray-500)">NIM: ${escapeHtml(p.nim)} • ${escapeHtml(p.divisi)}</div>
                    </div>
                    <button class="btn btn-primary btn-sm btn-quick-present" data-nim="${p.nim}" data-nama="${escapeHtml(p.nama)}" data-divisi="${escapeHtml(p.divisi)}" style="font-size:12px;padding:4px 10px">
                        <i class="bi bi-check-lg"></i> Hadirkan
                    </button>
                </div>
            `;
        });
    }

    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll('.btn-quick-present').forEach(btn => {
        btn.addEventListener('click', async () => {
            const nim = btn.dataset.nim;
            const nama = btn.dataset.nama;
            const divisi = btn.dataset.divisi;

            try {
                showLoading(true);
                await db.attendance.add({
                    nama,
                    nim,
                    divisi,
                    token: 'ADMIN',
                    status: 'Hadir',
                });
                showToast(`Presensi ${nama} berhasil ditandai hadir!`, 'success');
                renderUnattendedContent();
            } catch (err) {
                showToast('Gagal memproses presensi', 'error');
            } finally {
                showLoading(false);
            }
        });
    });
}

function initPrintReport() {
    $('printReportBtn')?.addEventListener('click', () => {
        const pagePresensi = $('pagePresensi');
        if (pagePresensi) {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            pagePresensi.classList.add('active');
        }

        const dateInfo = getIndonesianFullDate();
        const oldTitle = document.title;
        const pdfFileName = `Laporan_Presensi_MUBES_XXI_${dateInfo.fileDate}`;

        document.title = pdfFileName;
        const subheader = $('printDateSubheader');
        if (subheader) {
            subheader.textContent = `Himpunan Mahasiswa Informatika (HIMAFORKA) — ${dateInfo.displayDate}`;
        }

        window.print();

        setTimeout(() => {
            document.title = oldTitle;
        }, 1000);
    });
}
