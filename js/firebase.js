import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
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

const STORAGE_KEYS = {
  AUTH: "mubes_auth",
  SETTINGS: "mubes_settings",
  ATTENDANCE: "mubes_attendance",
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
   LOCAL STORAGE HELPERS
   ============================================================ */

function loadFromLocalStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (e) {
    console.warn(`[LocalStorage] Failed to load ${key}:`, e);
    return fallbackValue;
  }
}

function saveToLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`[LocalStorage] Failed to save ${key}:`, e);
  }
}

/* ============================================================
   FIREBASE INITIALIZATION & HYBRID STATE
   ============================================================ */

let app = null;
let firestore = null;
let firebaseAuth = null;
let isCloudConnected = false;
let modeListeners = [];

try {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
  firebaseAuth = getAuth(app);

  signInAnonymously(firebaseAuth).catch((err) => {
    console.warn("[Firebase] Anonymous auth notice:", err.message);
  });
} catch (err) {
  console.warn("[Firebase] SDK Initialization error, running in Local Storage mode:", err);
}

function setCloudStatus(status) {
  if (isCloudConnected !== status) {
    isCloudConnected = status;
    modeListeners.forEach((cb) => {
      try { cb(isCloudConnected); } catch (e) { console.error(e); }
    });
  }
}

export function isCloudMode() {
  return isCloudConnected;
}

export function onStorageModeChange(callback) {
  modeListeners.push(callback);
  callback(isCloudConnected);
  return () => {
    modeListeners = modeListeners.filter((cb) => cb !== callback);
  };
}

/* ============================================================
   AUTH — Local Storage Based
   ============================================================ */

const USERS = [
  {
    username: "admin@himaforka.ac.id",
    password: "Ayyrielganteng06",
    role: "admin",
    displayName: "Admin",
  },
  {
    username: "jeppp",
    password: "jeppp",
    role: "admin",
    displayName: "Jepri (Admin)",
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
    return loadFromLocalStorage(STORAGE_KEYS.AUTH, null);
  },

  login(username, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const cleanUser = username.trim().toLowerCase();
        const admin = USERS.find(
          (u) => u.username === cleanUser && u.password === password,
        );
        if (admin) {
          const user = {
            username: admin.username,
            uid: "admin-" + Date.now(),
            displayName: admin.displayName,
            role: admin.role,
          };
          saveToLocalStorage(STORAGE_KEYS.AUTH, user);
          notifyAuthListeners(user);
          resolve(user);
          return;
        }

        if (/^\d{8,12}$/.test(password)) {
          const user = {
            username: username.trim(),
            uid: "user-" + Date.now(),
            displayName: username.trim(),
            role: "user",
            nim: password,
          };
          saveToLocalStorage(STORAGE_KEYS.AUTH, user);
          notifyAuthListeners(user);
          resolve(user);
          return;
        }

        reject({
          code: "auth/invalid-credential",
          message: "Username atau password salah",
        });
      }, 200);
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
   DB — SETTINGS (Hybrid: LocalStorage + Firestore Sync)
   ============================================================ */

let settingsCache = loadFromLocalStorage(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
let settingsListeners = [];

function notifySettingsListeners(data) {
  settingsListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
}

if (firestore) {
  try {
    fsOnSnapshot(
      doc(firestore, "settings", "appSettings"),
      (snap) => {
        if (snap.exists()) {
          settingsCache = { ...DEFAULT_SETTINGS, ...snap.data() };
          saveToLocalStorage(STORAGE_KEYS.SETTINGS, settingsCache);
          setCloudStatus(true);
        } else {
          setDoc(doc(firestore, "settings", "appSettings"), settingsCache).catch(() => {});
          setCloudStatus(true);
        }
        notifySettingsListeners(settingsCache);
      },
      (error) => {
        console.warn("[Firebase] Settings Cloud Sync unavailable, falling back to Local Storage:", error.message);
        setCloudStatus(false);
        notifySettingsListeners(settingsCache);
      }
    );
  } catch (err) {
    console.warn("[Firebase] Settings snapshot setup error:", err);
    setCloudStatus(false);
  }
}

const settingsAPI = {
  get() {
    return { ...settingsCache };
  },

  async set(data) {
    const merged = { ...settingsCache, ...data };
    settingsCache = merged;
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settingsCache);
    notifySettingsListeners(settingsCache);

    if (firestore) {
      try {
        await setDoc(doc(firestore, "settings", "appSettings"), merged);
        setCloudStatus(true);
      } catch (error) {
        console.warn("[Firebase] Cloud setDoc failed, data saved locally:", error.message);
        setCloudStatus(false);
      }
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
   DB — ATTENDANCE (Hybrid: LocalStorage + Firestore Sync)
   ============================================================ */

let attendanceCache = loadFromLocalStorage(STORAGE_KEYS.ATTENDANCE, []);
let attendanceListeners = [];

function notifyAttendanceListeners(data) {
  attendanceListeners.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
}

if (firestore) {
  try {
    fsOnSnapshot(
      collection(firestore, "attendance"),
      (snapshot) => {
        attendanceCache = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        saveToLocalStorage(STORAGE_KEYS.ATTENDANCE, attendanceCache);
        setCloudStatus(true);
        notifyAttendanceListeners(attendanceCache);
      },
      (error) => {
        console.warn("[Firebase] Attendance Cloud Sync unavailable, falling back to Local Storage:", error.message);
        setCloudStatus(false);
        notifyAttendanceListeners(attendanceCache);
      }
    );
  } catch (err) {
    console.warn("[Firebase] Attendance snapshot setup error:", err);
    setCloudStatus(false);
  }
}

const attendanceAPI = {
  getAll() {
    return [...attendanceCache];
  },

  async add(data) {
    const id = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const record = {
      id,
      ...data,
      createdAt: Date.now(),
    };

    attendanceCache.unshift(record);
    saveToLocalStorage(STORAGE_KEYS.ATTENDANCE, attendanceCache);
    notifyAttendanceListeners(attendanceCache);

    if (firestore) {
      try {
        const docRef = await addDoc(collection(firestore, "attendance"), record);
        setCloudStatus(true);
        return { id: docRef.id, ...record };
      } catch (error) {
        console.warn("[Firebase] Attendance Cloud addDoc failed, data saved locally:", error.message);
        setCloudStatus(false);
      }
    }
    return record;
  },

  getByNim(nim) {
    return attendanceCache.filter((d) => d.nim === String(nim).trim());
  },

  existsByNim(nim) {
    return this.getByNim(nim).length > 0;
  },

  async deleteById(id) {
    attendanceCache = attendanceCache.filter((d) => d.id !== id);
    saveToLocalStorage(STORAGE_KEYS.ATTENDANCE, attendanceCache);
    notifyAttendanceListeners(attendanceCache);

    if (firestore) {
      try {
        await deleteDoc(doc(firestore, "attendance", id));
        setCloudStatus(true);
      } catch (error) {
        console.warn("[Firebase] Cloud deleteDoc failed, local updated:", error.message);
        setCloudStatus(false);
      }
    }
  },

  async deleteAll() {
    attendanceCache = [];
    saveToLocalStorage(STORAGE_KEYS.ATTENDANCE, []);
    notifyAttendanceListeners([]);

    if (firestore) {
      try {
        const snapshot = await getDocs(collection(firestore, "attendance"));
        if (snapshot.docs.length > 0) {
          const batch = writeBatch(firestore);
          snapshot.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        setCloudStatus(true);
      } catch (error) {
        console.warn("[Firebase] Cloud deleteAll failed, local cleared:", error.message);
        setCloudStatus(false);
      }
    }
  },

  query({ search = "", divisi = "" } = {}) {
    let list = [...attendanceCache];
    if (search) {
      const t = search.toLowerCase().trim();
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
  isCloudMode,
  onStorageModeChange,
};
