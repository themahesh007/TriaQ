// Offline-First IndexedDB and LocalStorage Resilience Manager for TriaQ

const DB_NAME = "TriaQOfflineDB";
const STORE_NAME = "intake_drafts";
const QUEUE_STORE = "offline_submissions";
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
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
        if (req.result !== undefined && req.result !== null) resolve(req.result);
        else {
          try {
            const raw = localStorage.getItem(`triaq_${key}`);
            resolve(raw ? JSON.parse(raw) : null);
          } catch {
            resolve(null);
          }
        }
      };
      req.onerror = () => {
        try {
          const raw = localStorage.getItem(`triaq_${key}`);
          resolve(raw ? JSON.parse(raw) : null);
        } catch {
          resolve(null);
        }
      };
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

/**
 * Queue an offline submission when network is unavailable
 */
export async function queueOfflineSubmission(submission) {
  const offlineItem = {
    id: "offline-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
    status: "OFFLINE_QUEUED",
    ...submission
  };

  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).put(offlineItem);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // LocalStorage fallback
    try {
      const existing = JSON.parse(localStorage.getItem("triaq_offline_queue") || "[]");
      existing.push(offlineItem);
      localStorage.setItem("triaq_offline_queue", JSON.stringify(existing));
    } catch (e) {
      console.error("Failed to store offline queue in localStorage:", e);
    }
  }

  return offlineItem;
}

/**
 * Get all pending offline submissions
 */
export async function getQueuedSubmissions() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readonly");
      const req = tx.objectStore(QUEUE_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => {
        try {
          const raw = JSON.parse(localStorage.getItem("triaq_offline_queue") || "[]");
          resolve(raw);
        } catch {
          resolve([]);
        }
      };
    });
  } catch {
    try {
      return JSON.parse(localStorage.getItem("triaq_offline_queue") || "[]");
    } catch {
      return [];
    }
  }
}

/**
 * Remove a single submission from queue after successful sync
 */
export async function removeQueuedSubmission(id) {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(QUEUE_STORE, "readwrite");
      tx.objectStore(QUEUE_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {}

  try {
    const existing = JSON.parse(localStorage.getItem("triaq_offline_queue") || "[]");
    const filtered = existing.filter((item) => item.id !== id);
    localStorage.setItem("triaq_offline_queue", JSON.stringify(filtered));
  } catch {}
}

/**
 * Sync all queued submissions to backend API
 */
export async function syncAllQueuedSubmissions(apiBase) {
  const queue = await getQueuedSubmissions();
  if (!queue || queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch(`${apiBase}/api/triage-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: item.patientId,
          symptomText: item.symptomText,
          vitals: item.vitals,
          facility: item.facility,
          facilityId: item.facilityId,
          reportImageBase64: item.reportImageBase64
        })
      });

      if (res.ok) {
        await removeQueuedSubmission(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
    }
  }

  return { synced, failed };
}
