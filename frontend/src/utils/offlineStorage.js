// Offline-First IndexedDB and LocalStorage Resilience Manager for TriaQ

const DB_NAME = "TriaQOfflineDB";
const STORE_NAME = "intake_drafts";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save draft to IndexedDB with localStorage fallback
 */
export async function saveDraft(key, data) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(data, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        // Fallback to localStorage
        try {
          localStorage.setItem(`triaq_${key}`, JSON.stringify(data));
          resolve(true);
        } catch {
          resolve(false);
        }
      };
    });
  } catch {
    try {
      localStorage.setItem(`triaq_${key}`, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Load draft from IndexedDB with localStorage fallback
 */
export async function loadDraft(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result) resolve(req.result);
        else {
          try {
            const raw = localStorage.getItem(`triaq_${key}`);
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    try {
      const raw = localStorage.getItem(`triaq_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Delete draft from IndexedDB and localStorage
 */
export async function deleteDraft(key) {
  try {
    localStorage.removeItem(`triaq_${key}`);
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(true);
    });
  } catch {
    return true;
  }
}
