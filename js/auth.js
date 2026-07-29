/* ============================================================
   AUTH — Login/Logout Admin (local)
   ============================================================ */

import { auth } from './firebase.js';
import { showToast, showLoading } from './utils.js';

/* ---------- DOM ---------- */
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const passwordToggle = document.getElementById('passwordToggle');

/* ---------- PASSWORD TOGGLE ---------- */
if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        passwordToggle.innerHTML = type === 'password'
            ? '<i class="bi bi-eye"></i>'
            : '<i class="bi bi-eye-slash"></i>';
    });
}

/* ---------- LOGIN ---------- */
async function handleLogin(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const passwordVal = passwordInput.value;

    if (!username || !passwordVal) {
        showToast('Harap isi username dan password', 'error');
        return;
    }

    showLoading(true);
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Memproses...';
    if (loginError) loginError.style.display = 'none';

    try {
        const user = await auth.login(username, passwordVal);
        showToast('Login berhasil!', 'success');
        if (user.role === 'admin') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'attendance.html';
        }
    } catch (error) {
        let message = 'Username atau password salah.';
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
        showToast(message, 'error');
    } finally {
        showLoading(false);
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Masuk';
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
}

/* ---------- AUTH STATE ---------- */
auth.onAuthChanged((user) => {
    const path = window.location.pathname;
    const isIndexPage = path.endsWith('index.html') || path.endsWith('/') || path === '' || path.endsWith('login.html');
    const isDashboardPage = path.includes('dashboard.html');
    const isAttendancePage = path.includes('attendance.html');

    if (user && isAttendancePage && user.role === 'admin') {
        window.location.href = 'dashboard.html';
    } else if (!user && (isDashboardPage || isAttendancePage)) {
        window.location.href = 'index.html';
    }
});

/* ---------- LOGOUT ---------- */
export async function logoutAdmin() {
    showLoading(true);
    try {
        await auth.logout();
        showToast('Berhasil keluar', 'info');
        window.location.href = 'index.html';
    } catch (error) {
        showToast('Gagal keluar', 'error');
        showLoading(false);
    }
}
