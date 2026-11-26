import api from './api';

const DB_NAME = 'BiogasOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline_mutations';

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientOpId' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('clientTimestamp', 'clientTimestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export const enqueueOfflineOp = async (entityType, operation, payload) => {
  try {
    const db = await openDB();
    const clientOpId = `OP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const opRecord = {
      clientOpId,
      entityType,
      operation: operation || 'CREATE',
      payload,
      clientTimestamp: new Date().toISOString(),
      status: 'pending'
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(opRecord);
      req.onsuccess = () => resolve(opRecord);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to enqueue offline record:', err);
    // Fallback in case IndexedDB fails (e.g. private browsing storage quota)
    const pending = JSON.parse(localStorage.getItem('biogas_offline_fallback') || '[]');
    const clientOpId = `OP-FB-${Date.now()}`;
    const opRecord = { clientOpId, entityType, operation, payload, clientTimestamp: new Date().toISOString(), status: 'pending' };
    pending.push(opRecord);
    localStorage.setItem('biogas_offline_fallback', JSON.stringify(pending));
    return opRecord;
  }
};

export const getPendingOps = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return JSON.parse(localStorage.getItem('biogas_offline_fallback') || '[]');
  }
};

export const removeOp = async (clientOpId) => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(clientOpId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const pending = JSON.parse(localStorage.getItem('biogas_offline_fallback') || '[]');
    const filtered = pending.filter((op) => op.clientOpId !== clientOpId);
    localStorage.setItem('biogas_offline_fallback', JSON.stringify(filtered));
  }
};

export const syncPendingOps = async () => {
  const pending = await getPendingOps();
  if (pending.length === 0) {
    return { success: true, count: 0, message: 'No offline records pending' };
  }

  try {
    const res = await api.post('/sync/batch', { operations: pending });
    if (res.data.success) {
      // Clean up successfully applied operations
      for (const op of pending) {
        await removeOp(op.clientOpId);
      }
      return {
        success: true,
        count: pending.length,
        applied: res.data.appliedCount,
        details: res.data.results
      };
    }
    return { success: false, message: 'Server sync returned unhandled status' };
  } catch (err) {
    console.error('Offline batch sync failed:', err);
    throw err;
  }
};

// Automatic listener when network reconnects
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[OfflineSync] Network connectivity restored. Attempting auto-sync...');
    try {
      await syncPendingOps();
    } catch (e) {
      console.warn('[OfflineSync] Auto-sync attempt deferred:', e.message);
    }
  });
}
