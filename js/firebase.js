/* ============================================================
   FIREBASE — Data layer (localStorage-based)
   ============================================================
   Sistem menggunakan localStorage sebagai database lokal.
   Data tetap tersimpan meskipun browser ditutup.
   
   Untuk upgrade ke Firebase Firestore sungguhan:
   1. Dapatkan firebaseConfig dari Firebase Console
   2. Ganti isi file ini dengan Firebase inisialisasi
   3. Tidak perlu mengubah file lain (API sama)
   ============================================================ */

const STORAGE_KEYS = {
    ATTENDANCE: 'mubes_attendance',
    SETTINGS: 'mubes_settings',
    AUTH: 'mubes_auth',
};

const DEFAULT_SETTINGS = {
    currentToken: '',
    expiredAt: Date.now() + 60000,
    interval: 60,
    autoGenerate: true,
};

/* ---------- HELPERS ---------- */

function getItem(key, fallback = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

function setItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* ---------- TIMESTAMP ---------- */

export function serverTimestamp() {
    return Date.now();
}

/* ============================================================
   AUTH
   ============================================================ */

const USERS = [
    { username: 'admin@himaforka.ac.id', password: 'Ayyrielganteng06', role: 'admin', displayName: 'Admin' },
];

let authListeners = [];

function notifyAuthListeners(user) {
    authListeners.forEach(cb => {
        try { cb(user); } catch (e) { console.error(e); }
    });
}

export const auth = {
    get currentUser() {
        return getItem(STORAGE_KEYS.AUTH, null);
    },

    login(username, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const admin = USERS.find(u => u.username === username.trim().toLowerCase() && u.password === password);
                if (admin) {
                    const user = { username: admin.username, uid: 'admin-' + Date.now(), displayName: admin.displayName, role: admin.role };
                    setItem(STORAGE_KEYS.AUTH, user);
                    notifyAuthListeners(user);
                    resolve(user);
                    return;
                }

                if (/^\d{9}$/.test(password)) {
                    const user = { username: username.trim(), uid: 'user-' + Date.now(), displayName: username.trim(), role: 'user', nim: password };
                    setItem(STORAGE_KEYS.AUTH, user);
                    notifyAuthListeners(user);
                    resolve(user);
                    return;
                }

                reject({ code: 'auth/invalid-credential', message: 'Username atau password salah' });
            }, 300);
        });
    },

    logout() {
        return new Promise((resolve) => {
            localStorage.removeItem(STORAGE_KEYS.AUTH);
            notifyAuthListeners(null);
            resolve();
        });
    },

    onAuthChanged(callback) {
        authListeners.push(callback);
        const user = this.currentUser;
        if (user) {
            setTimeout(() => callback(user), 0);
        }
        return () => {
            authListeners = authListeners.filter(cb => cb !== callback);
        };
    },
};

/* ============================================================
   DB — SETTINGS
   ============================================================ */

let settingsListeners = [];
let settingsPollTimer = null;

const settingsAPI = {
    get() {
        return getItem(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
    },

    set(data) {
        const current = this.get();
        const merged = { ...current, ...data };
        setItem(STORAGE_KEYS.SETTINGS, merged);
        notifySettingsListeners(merged);
        return merged;
    },

    update(data) {
        return this.set(data);
    },

    onSnapshot(callback) {
        settingsListeners.push(callback);
        callback(this.get());

        if (!settingsPollTimer) {
            settingsPollTimer = setInterval(() => {
                const data = this.get();
                notifySettingsListeners(data);
            }, 1000);
        }

        return () => {
            settingsListeners = settingsListeners.filter(cb => cb !== callback);
            if (settingsListeners.length === 0 && settingsPollTimer) {
                clearInterval(settingsPollTimer);
                settingsPollTimer = null;
            }
        };
    },
};

function notifySettingsListeners(data) {
    settingsListeners.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
    });
}

/* ============================================================
   DB — ATTENDANCE
   ============================================================ */

let attendanceListeners = [];
let attendancePollTimer = null;

const attendanceAPI = {
    getAll() {
        return getItem(STORAGE_KEYS.ATTENDANCE, []);
    },

    add(data) {
        const list = this.getAll();
        const record = {
            id: generateId(),
            ...data,
            createdAt: Date.now(),
        };
        list.push(record);
        setItem(STORAGE_KEYS.ATTENDANCE, list);
        notifyAttendanceListeners(list);
        return record;
    },

    getByNim(nim) {
        const list = this.getAll();
        return list.filter(d => d.nim === nim);
    },

    existsByNim(nim) {
        return this.getByNim(nim).length > 0;
    },

    deleteAll() {
        localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
        notifyAttendanceListeners([]);
    },

    query({ search = '', divisi = '' } = {}) {
        let list = this.getAll();
        if (search) {
            const t = search.toLowerCase();
            list = list.filter(d =>
                (d.nama || '').toLowerCase().includes(t) ||
                (d.nim || '').toLowerCase().includes(t)
            );
        }
        if (divisi) {
            list = list.filter(d => d.divisi === divisi);
        }
        return list;
    },

    getSorted(order = 'desc') {
        const list = this.getAll();
        list.sort((a, b) => order === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
        return list;
    },

    onSnapshot(callback) {
        attendanceListeners.push(callback);
        callback(this.getAll());

        if (!attendancePollTimer) {
            attendancePollTimer = setInterval(() => {
                const data = this.getAll();
                notifyAttendanceListeners(data);
            }, 1000);
        }

        return () => {
            attendanceListeners = attendanceListeners.filter(cb => cb !== callback);
            if (attendanceListeners.length === 0 && attendancePollTimer) {
                clearInterval(attendancePollTimer);
                attendancePollTimer = null;
            }
        };
    },
};

function notifyAttendanceListeners(data) {
    attendanceListeners.forEach(cb => {
        try { cb(data); } catch (e) { console.error(e); }
    });
}

/* ============================================================
   DB EXPORT
   ============================================================ */

export const db = {
    settings: settingsAPI,
    attendance: attendanceAPI,
};
