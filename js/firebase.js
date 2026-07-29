import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot as fsOnSnapshot,
  collection,
  addDoc,
  getDocs,
  writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABZNvrk9ecNDrq2DxNwE8kpWR2rBVFlrA",
  authDomain: "presensi-mubes.firebaseapp.com",
  projectId: "presensi-mubes",
  storageBucket: "presensi-mubes.firebasestorage.app",
  messagingSenderId: "1000946113417",
  appId: "1:1000946113417:web:4bfa0abea410801c591f58",
  measurementId: "G-GNZW8P865J",
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const STORAGE_KEYS = {
  AUTH: "mubes_auth",
};

const DEFAULT_SETTINGS = {
  currentToken: "",
  expiredAt: Date.now() + 60000,
  interval: 60,
  autoGenerate: true,
};

export function serverTimestamp() {
  return Date.now();
}

/* ============================================================
   AUTH — localStorage-based (unchanged)
   ============================================================ */

const USERS = [
  {
    username: "admin@himaforka.ac.id",
    password: "Ayyrielganteng06",
    role: "admin",
    displayName: "Admin",
  },
];

let authListeners = [];

function notifyAuthListeners(user) {
  authListeners.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error(e);
    }
  });
}

export const auth = {
  get currentUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  login(username, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const admin = USERS.find(
          (u) =>
            u.username === username.trim().toLowerCase() &&
            u.password === password,
        );
        if (admin) {
          const user = {
            username: admin.username,
            uid: "admin-" + Date.now(),
            displayName: admin.displayName,
            role: admin.role,
          };
          try {
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
          } catch {}
          notifyAuthListeners(user);
          resolve(user);
          return;
        }

        if (/^\d{9}$/.test(password)) {
          const user = {
            username: username.trim(),
            uid: "user-" + Date.now(),
            displayName: username.trim(),
            role: "user",
            nim: password,
          };
          try {
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
          } catch {}
          notifyAuthListeners(user);
          resolve(user);
          return;
        }

        reject({
          code: "auth/invalid-credential",
          message: "Username atau password salah",
        });
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
      authListeners = authListeners.filter((cb) => cb !== callback);
    };
  },
};

/* ============================================================
   DB — SETTINGS (Firestore)
   ============================================================ */

let settingsCache = { ...DEFAULT_SETTINGS };
let settingsListeners = [];
let settingsUnsub = null;

fsOnSnapshot(
  doc(firestore, "settings", "appSettings"),
  (snap) => {
    if (snap.exists()) {
      settingsCache = { ...DEFAULT_SETTINGS, ...snap.data() };
    } else {
      setDoc(doc(firestore, "settings", "appSettings"), DEFAULT_SETTINGS).catch(
        () => {},
      );
    }
    notifySettingsListeners(settingsCache);
  },
  (error) => {
    console.error("[Firebase] Settings snapshot error:", error);
    notifySettingsListeners(settingsCache);
  },
);

function notifySettingsListeners(data) {
  settingsListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
}

const settingsAPI = {
  get() {
    return { ...settingsCache };
  },

  async set(data) {
    const merged = { ...settingsCache, ...data };
    settingsCache = merged;
    notifySettingsListeners(settingsCache);
    try {
      await setDoc(doc(firestore, "settings", "appSettings"), merged);
    } catch (error) {
      console.error("[Firebase] Settings set error:", error);
    }
    return merged;
  },

  update(data) {
    return this.set(data);
  },

  onSnapshot(callback) {
    settingsListeners.push(callback);
    callback({ ...settingsCache });
    return () => {
      settingsListeners = settingsListeners.filter((cb) => cb !== callback);
    };
  },
};

/* ============================================================
   DB — ATTENDANCE (Firestore)
   ============================================================ */

let attendanceCache = [];
let attendanceListeners = [];

fsOnSnapshot(
  collection(firestore, "attendance"),
  (snapshot) => {
    attendanceCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    notifyAttendanceListeners(attendanceCache);
  },
  (error) => {
    console.error("[Firebase] Attendance snapshot error:", error);
    notifyAttendanceListeners(attendanceCache);
  },
);

function notifyAttendanceListeners(data) {
  attendanceListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
}

const attendanceAPI = {
  getAll() {
    return [...attendanceCache];
  },

  async add(data) {
    const record = {
      ...data,
      createdAt: Date.now(),
    };
    const docRef = await addDoc(collection(firestore, "attendance"), record);
    return { id: docRef.id, ...record };
  },

  getByNim(nim) {
    return attendanceCache.filter((d) => d.nim === nim);
  },

  existsByNim(nim) {
    return this.getByNim(nim).length > 0;
  },

  async deleteAll() {
    attendanceCache = [];
    notifyAttendanceListeners([]);
    try {
      const snapshot = await getDocs(collection(firestore, "attendance"));
      if (snapshot.docs.length > 0) {
        const batch = writeBatch(firestore);
        snapshot.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      console.error("[Firebase] Attendance deleteAll error:", error);
    }
  },

  query({ search = "", divisi = "" } = {}) {
    let list = [...attendanceCache];
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.nama || "").toLowerCase().includes(t) ||
          (d.nim || "").toLowerCase().includes(t),
      );
    }
    if (divisi) {
      list = list.filter((d) => d.divisi === divisi);
    }
    return list;
  },

  getSorted(order = "desc") {
    const list = [...attendanceCache];
    list.sort((a, b) =>
      order === "desc" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt,
    );
    return list;
  },

  onSnapshot(callback) {
    attendanceListeners.push(callback);
    callback([...attendanceCache]);
    return () => {
      attendanceListeners = attendanceListeners.filter((cb) => cb !== callback);
    };
  },
};

/* ============================================================
   EXPORTS
   ============================================================ */

export const db = {
  settings: settingsAPI,
  attendance: attendanceAPI,
};
