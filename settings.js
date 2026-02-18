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
    }
  } catch(_){}
}

async function saveAndTest(){
  const cfg = { enabled: true };
  fields.forEach(k => { const el=document.getElementById(k); cfg[k] = el?el.value.trim():''; });
  localStorage.setItem('cloudSyncConfig', JSON.stringify(cfg));
  syncStatus.textContent = 'Saving and testing connection...';
  try {
    if (window.__syncConfig) {
      const db = await window.__syncConfig.ensureFirebase(cfg);
      if (!db) throw new Error('Firebase not available');
      syncStatus.textContent = 'Connected. You can Sync Now.';
    } else {
      syncStatus.textContent = 'Sync module not loaded.';
    }
  } catch (e) {
    syncStatus.textContent = 'Failed to connect: ' + e.message;
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
if (syncNowBtn) syncNowBtn.addEventListener('click', syncNow);

loadSyncForm();
