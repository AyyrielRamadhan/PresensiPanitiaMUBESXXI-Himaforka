/* ============================================================
   THEME ENGINE — Dark Mode / Light Mode Switcher
   ============================================================ */

export function getPreferredTheme() {
    const stored = localStorage.getItem('mubes_theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mubes_theme', theme);
    updateThemeUI(theme);
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
}

export function updateThemeUI(theme) {
    const btns = document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn');
    btns.forEach(btn => {
        if (theme === 'dark') {
            btn.innerHTML = '<i class="bi bi-sun-fill" style="color:#f59e0b;font-size:18px"></i>';
            btn.setAttribute('title', 'Beralih ke Mode Terang (Light Mode)');
        } else {
            btn.innerHTML = '<i class="bi bi-moon-stars-fill" style="color:var(--maroon);font-size:18px"></i>';
            btn.setAttribute('title', 'Beralih ke Mode Gelap (Dark Mode)');
        }
    });

    const themeToggleCheck = document.getElementById('themeToggleCheck');
    if (themeToggleCheck) {
        themeToggleCheck.checked = (theme === 'dark');
    }
}

export function initThemeEngine() {
    const theme = getPreferredTheme();
    setTheme(theme);

    document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = toggleTheme();
            import('./utils.js').then(({ showToast }) => {
                showToast(`Mode Tampilan: ${newTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info');
            }).catch(() => {});
        });
    });

    const themeToggleCheck = document.getElementById('themeToggleCheck');
    if (themeToggleCheck) {
        themeToggleCheck.addEventListener('change', () => {
            const next = themeToggleCheck.checked ? 'dark' : 'light';
            setTheme(next);
        });
    }
}

// Auto-run on script import
initThemeEngine();
