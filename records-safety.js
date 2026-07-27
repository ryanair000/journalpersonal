(() => {
  'use strict';

  const DB_NAME = 'my-little-life-recovery';
  const STORE_NAME = 'snapshots';
  const MAX_SNAPSHOTS = 20;
  const AUTO_DELAY = 1800;
  const EXCLUDED_KEYS = new Set([
    'mll.sync.meta.v1',
    'mll.sync.keyTimes.v1',
    'mll.authenticatedBefore',
    'privacyPinHash',
    'myLittleLife.formNotice',
    'myLittleLife.commandNotice'
  ]);
  const EXCLUDED_PREFIXES = ['sb-', 'supabase.', 'mll.auth.', 'mll.recovery.'];
  let autoTimer = null;
  let lastChecksum = '';
  let snapshotsSuspended = false;

  const isRecordKey = (key) => {
    const text = String(key || '');
    return Boolean(text) && !EXCLUDED_KEYS.has(text) && !EXCLUDED_PREFIXES.some((prefix) => text.startsWith(prefix));
  };

  const collectRecordData = () => {
    const data = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (isRecordKey(key)) data[key] = localStorage.getItem(key);
    }
    return data;
  };

  const canonicalJson = (data) => JSON.stringify(Object.keys(data || {}).sort().reduce((result, key) => {
    result[key] = data[key];
    return result;
  }, {}));

  const checksumData = async (data) => {
    const bytes = new TextEncoder().encode(canonicalJson(data));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const openDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const runStore = async (mode, operation) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const result = operation(store);
      transaction.oncomplete = () => { db.close(); resolve(result?.result); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    });
  };

  const getSnapshots = async () => {
    const snapshots = await runStore('readonly', (store) => store.getAll());
    return (snapshots || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const createBackupEnvelope = async (data = collectRecordData()) => {
    const checksum = await checksumData(data);
    return {
      app: 'my little life',
      version: 3,
      exportedAt: new Date().toISOString(),
      integrity: { algorithm: 'SHA-256', checksum, keyCount: Object.keys(data).length, characterCount: canonicalJson(data).length },
      data
    };
  };

  const refreshRecoveryCard = async () => {
    const select = document.querySelector('#recoveryPointSelect');
    const status = document.querySelector('#recoveryStatus');
    if (!select || !status) return;
    try {
      const snapshots = await getSnapshots();
      select.innerHTML = snapshots.length
        ? snapshots.map((item) => `<option value="${item.id}">${new Date(item.createdAt).toLocaleString()} · ${item.reason} · ${item.keyCount} items</option>`).join('')
        : '<option value="">No recovery points yet</option>';
      status.textContent = snapshots.length
        ? `${snapshots.length} protected recovery ${snapshots.length === 1 ? 'copy' : 'copies'} on this device. Latest: ${new Date(snapshots[0].createdAt).toLocaleString()}.`
        : 'Preparing your first protected recovery copy…';
    } catch {
      status.textContent = 'Recovery history is unavailable in this browser. JSON exports still work.';
    }
  };

  const createSnapshot = async (reason = 'automatic', force = false) => {
    const data = collectRecordData();
    const checksum = await checksumData(data);
    if (!force && checksum === lastChecksum) return null;
    const now = new Date().toISOString();
    const snapshot = { id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`, createdAt: now, reason, checksum, keyCount: Object.keys(data).length, data };
    await runStore('readwrite', (store) => store.put(snapshot));
    lastChecksum = checksum;
    const snapshots = await getSnapshots();
    if (snapshots.length > MAX_SNAPSHOTS) {
      await runStore('readwrite', (store) => snapshots.slice(MAX_SNAPSHOTS).forEach((item) => store.delete(item.id)));
    }
    refreshRecoveryCard();
    return snapshot;
  };

  const scheduleSnapshot = () => {
    if (snapshotsSuspended) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => createSnapshot('automatic').catch(() => {}), AUTO_DELAY);
  };

  const runWithoutSnapshots = async (operation) => {
    snapshotsSuspended = true;
    clearTimeout(autoTimer);
    try { return await operation(); }
    finally { snapshotsSuspended = false; scheduleSnapshot(); }
  };

  const previousSetItem = Storage.prototype.setItem;
  const previousRemoveItem = Storage.prototype.removeItem;
  const previousClear = Storage.prototype.clear;
  Storage.prototype.setItem = function setItem(key, value) {
    const result = previousSetItem.call(this, key, value);
    if (this === localStorage && isRecordKey(key) && !snapshotsSuspended) scheduleSnapshot();
    return result;
  };
  Storage.prototype.removeItem = function removeItem(key) {
    if (this === localStorage && isRecordKey(key) && this.getItem(key) !== null && !snapshotsSuspended) createSnapshot('before deletion', true).catch(() => {});
    const result = previousRemoveItem.call(this, key);
    if (this === localStorage && isRecordKey(key)) scheduleSnapshot();
    return result;
  };
  Storage.prototype.clear = function clear() {
    if (this === localStorage && !snapshotsSuspended) createSnapshot('before clear', true).catch(() => {});
    const result = previousClear.call(this);
    if (this === localStorage) scheduleSnapshot();
    return result;
  };

  const downloadJson = (content, filename) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const setupRecoveryCard = () => {
    const backupTools = document.querySelector('.backup-tools');
    if (!backupTools || document.querySelector('#recoveryTools')) return;
    const card = document.createElement('div');
    card.id = 'recoveryTools';
    card.className = 'recovery-tools';
    card.innerHTML = '<p class="eyebrow">Device recovery history</p><p id="recoveryStatus" role="status">Preparing your recovery history…</p><label for="recoveryPointSelect">Available recovery points</label><select id="recoveryPointSelect"></select><div class="recovery-actions"><button type="button" id="saveRecoveryPoint">Save recovery point</button><button type="button" id="downloadRecoveryPoint">Download selected copy</button><button type="button" id="restoreRecoveryPoint">Restore selected copy</button></div><small>Up to 20 rolling copies stay only on this device. Use Export data for a separate file you can keep elsewhere.</small>';
    backupTools.insertAdjacentElement('afterend', card);

    document.querySelector('#saveRecoveryPoint')?.addEventListener('click', async () => {
      const button = document.querySelector('#saveRecoveryPoint');
      button.disabled = true;
      await createSnapshot('manual', true).catch(() => {});
      button.disabled = false;
    });
    document.querySelector('#downloadRecoveryPoint')?.addEventListener('click', async () => {
      const id = document.querySelector('#recoveryPointSelect')?.value;
      const snapshot = (await getSnapshots()).find((item) => item.id === id);
      if (!snapshot) return;
      const backup = await createBackupEnvelope(snapshot.data);
      backup.recoveredFrom = snapshot.createdAt;
      downloadJson(backup, `my-little-life-recovery-${snapshot.createdAt.slice(0, 10)}.json`);
    });
    document.querySelector('#restoreRecoveryPoint')?.addEventListener('click', async () => {
      const id = document.querySelector('#recoveryPointSelect')?.value;
      const snapshot = (await getSnapshots()).find((item) => item.id === id);
      if (!snapshot || !confirm(`Restore the recovery copy from ${new Date(snapshot.createdAt).toLocaleString()}? A safety copy of your current records will be kept first.`)) return;
      await createSnapshot('before restore', true);
      await runWithoutSnapshots(async () => {
        Object.keys(collectRecordData()).forEach((key) => localStorage.removeItem(key));
        Object.entries(snapshot.data).forEach(([key, value]) => { if (isRecordKey(key) && typeof value === 'string') localStorage.setItem(key, value); });
      });
      await window.mllCloudSync?.syncNow?.().catch(() => {});
      window.location.reload();
    });
    refreshRecoveryCard();
  };

  window.mllRecordsSafety = { isRecordKey, collectRecordData, checksumData, createBackupEnvelope, createSnapshot, getSnapshots, runWithoutSnapshots };
  window.addEventListener('load', async () => {
    setupRecoveryCard();
    try {
      const existing = await getSnapshots();
      lastChecksum = existing[0]?.checksum || '';
      await createSnapshot('automatic baseline');
      refreshRecoveryCard();
    } catch { /* JSON export remains available if IndexedDB is unavailable. */ }
  });
})();
