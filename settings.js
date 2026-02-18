const clearBtn = document.getElementById('clear-data');
const statusEl = document.getElementById('settings-status');
const saveSyncBtn = document.getElementById('save-sync');
const syncNowBtn = document.getElementById('sync-now');
const syncStatus = document.getElementById('sync-status');
const fields = ['apiKey','authDomain','projectId','appId','storageBucket','messagingSenderId','measurementId','syncCode'];

clearBtn.addEventListener('click', () => {
  const ok = confirm('Are you sure you want to delete? Once you delete, you cannot recover customers information and will have to re-enter again.');
  if (!ok) return;
  localStorage.removeItem('customers');
  statusEl.textContent = 'All customers deleted.';
});

function loadSyncForm(){
  try {
    const cfg = JSON.parse(localStorage.getItem('cloudSyncConfig')||'null');
    if (cfg) {
      fields.forEach(k => { const el = document.getElementById(k); if (el && cfg[k]) el.value = cfg[k]; });
      if (syncNowBtn) syncNowBtn.disabled = !cfg.enabled;
    }
  } catch(_){}
}

async function saveAndTest(){
  const cfg = { enabled: true };
  fields.forEach(k => { const el=document.getElementById(k); cfg[k] = el?el.value.trim():''; });
  localStorage.setItem('cloudSyncConfig', JSON.stringify(cfg));
  syncStatus.textContent = 'Saving and testing connection...';
  try {
    if (!navigator.onLine) throw new Error('Device appears offline');
    // quick connectivity check
    try { await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors' }); } catch(_){ }
    if (!window.__syncConfig) throw new Error('Sync module not loaded');
    const db = await window.__syncConfig.ensureFirebase(cfg);
    if (!db) throw new Error('Firebase not available');
    // simple write/read test
    const docRef = db.collection('measurepro').doc(cfg.syncCode || 'test');
    await docRef.set({ __health: Date.now() }, { merge: true });
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('Write verification failed');
    syncStatus.textContent = 'Connected and write verified. You can Sync Now.';
    if (syncNowBtn) syncNowBtn.disabled = false;
  } catch (e) {
    syncStatus.textContent = 'Failed to connect: ' + e.message + '. Ensure Firestore is enabled and Anonymous auth is ON in Firebase Authentication.';
  }
}

async function syncNow(){
  try {
    const customers = JSON.parse(localStorage.getItem('customers')||'[]');
    if (window.MeasureSync && window.MeasureSync.isEnabled) {
      await window.MeasureSync.pushNow(customers);
      syncStatus.textContent = 'Sync pushed.';
    } else {
      // attempt one-off start
      if (window.__syncConfig) {
        const cfg = JSON.parse(localStorage.getItem('cloudSyncConfig')||'null');
        const db = await window.__syncConfig.ensureFirebase(cfg);
        await db.collection('measurepro').doc(cfg.syncCode).set({ customers, updatedAt: Date.now() }, { merge: true });
        syncStatus.textContent = 'Sync pushed.';
      }
    }
  } catch (e) {
    syncStatus.textContent = 'Sync failed: ' + e.message;
  }
}

if (saveSyncBtn) saveSyncBtn.addEventListener('click', saveAndTest);
if (syncNowBtn) {
  syncNowBtn.addEventListener('click', async () => {
    if (syncNowBtn.disabled) return;
    const prev = syncNowBtn.textContent;
    syncNowBtn.textContent = 'Syncing...';
    try {
      await syncNow();
    } finally {
      setTimeout(() => { syncNowBtn.textContent = prev; }, 500);
    }
  });
  // disabled by default until Save & Test succeeds
  syncNowBtn.disabled = true;
}

loadSyncForm();

// show status messages from sync.js
window.addEventListener('measure-sync-status', (e) => {
  if (!syncStatus) return;
  const d = e.detail || {}; syncStatus.textContent = (d.message || '');
});
