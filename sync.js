;(function(){
  const KEY = 'cloudSyncConfig';
  const DOC_ID = 'EbereFamily-MeasurePro-2026';
  function readConfig(){
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
  }
  function saveConfig(cfg){ localStorage.setItem(KEY, JSON.stringify(cfg)); }
  function loadScript(src){ return new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
  async function ensureFirebase(cfg){
    if (!cfg) return null;
    if (!window.firebase) {
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js');
      if (cfg.measurementId) {
        try { await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics-compat.js'); } catch(_){}
      }
    }
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    try { await firebase.auth().signInAnonymously(); }
    catch(e) {
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Anonymous auth failed: '+ (e && e.message || 'Unknown') } }));
    }
    try { if (cfg.measurementId && firebase.analytics) firebase.analytics(); } catch(_){}
    const db = firebase.firestore();
    try { await db.enableNetwork(); } catch(_){}
    return db;
  }
  function getCustomers(){ try { return JSON.parse(localStorage.getItem('customers')||'[]'); } catch { return []; } }
  function setCustomers(arr){ localStorage.setItem('customers', JSON.stringify(arr)); }
  function parseDate(d){ const t = Date.parse(d||''); return isNaN(t)?0:t; }
  function mergeCustomers(local, remote){
    const byId = new Map();
    const put = (c)=>{ if(!c.id) return; const ex=byId.get(c.id); if(!ex){ byId.set(c.id, c); return; } const a=parseDate(ex.date), b=parseDate(c.date); byId.set(c.id, b>=a?c:ex); };
    local.forEach(put); remote.forEach(put);
    return Array.from(byId.values()).sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }
  async function pull(db){
    try {
      const snap = await db.collection('measurepro').doc(DOC_ID).get();
      const local = getCustomers();
      
      if (!snap.exists) {
        if (local.length) {
          await push(db, local);
          window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'info', message:'Seeded cloud with ' + local.length + ' customers' } }));
        }
        return local.length;
      }

      const data = snap.data() || {};
      const remote = Array.isArray(data.customers) ? data.customers : [];
      
      // Smart Merge: combine local and remote, taking the most recent version of each customer
      const merged = mergeCustomers(local, remote);
      
      // If the merged result is different from remote, update the cloud
      if (JSON.stringify(merged) !== JSON.stringify(remote)) {
        await push(db, merged);
      }
      
      setCustomers(merged);
      window.dispatchEvent(new Event('measure-sync-updated'));
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'success', message:'Synced ' + merged.length + ' customers' } }));
      return merged.length;
    } catch(e) {
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Sync error: ' + (e.message || 'Check connection') } }));
      throw e;
    }
  }
  async function push(db, customers){
    try {
      await db.collection('measurepro').doc(DOC_ID).set({ customers, updatedAt: Date.now() }, { merge: true });
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'success', message:'Pushed '+(customers?customers.length:0)+' customers' } }));
    } catch(e) {
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Push failed: '+ (e && e.message || 'Unknown') } }));
      throw e;
    }
  }
  async function initAndStart(){
    const cfg = readConfig();
    if (!cfg || !cfg.enabled || !cfg.apiKey || !cfg.projectId || !cfg.appId) return;
    try {
      if (!navigator.onLine) {
        window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Offline' } }));
      }
      const db = await ensureFirebase(cfg);
      const DOC_ID = 'EbereFamily-MeasurePro-2026';
      
      // Initial Sync
      try { await pull(db); } catch(_){}
      
      // Real-time listener
      db.collection('measurepro').doc(DOC_ID).onSnapshot(async (snap) => {
        if (!snap.exists) return;
        const data = snap.data() || {};
        const remote = Array.isArray(data.customers) ? data.customers : [];
        const local = getCustomers();
        
        // Only update if remote is actually different to avoid loops
        if (JSON.stringify(remote) !== JSON.stringify(local)) {
          const merged = mergeCustomers(local, remote);
          setCustomers(merged);
          window.dispatchEvent(new Event('measure-sync-updated'));
          const ts = new Date().toLocaleTimeString();
          window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'success', message:'Live sync: ' + ts } }));
        }
      }, (e) => {
        window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Sync lost' } }));
      });

      window.MeasureSync = {
        isEnabled: true,
        async pushNow(list){ try { await push(db, list||getCustomers()); } catch(e){} },
        async pullNow(){ try { await pull(db); } catch(e){} }
      };
    } catch(e) {
      window.MeasureSync = { isEnabled:false };
      window.dispatchEvent(new CustomEvent('measure-sync-status', { detail: { level:'error', message:'Init failed' } }));
    }
  }
  // kick on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAndStart);
  } else { initAndStart(); }

  // expose helpers for settings page
  window.__syncConfig = { readConfig, saveConfig, ensureFirebase };

  function updatePill(level, text){
    const el = document.getElementById('sync-pill');
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('sync-error','sync-info','sync-off');
    if (level === 'error') el.classList.add('sync-error');
    else if (level === 'info') el.classList.add('sync-info');
    else if (level === 'success') el.classList.remove('sync-off');
  }
  window.addEventListener('measure-sync-status', (e)=>{
    const d = e.detail || {}; updatePill(d.level, d.message || '');
  });
  window.addEventListener('measure-sync-updated', ()=>{
    const ts = new Date();
    updatePill('success', 'Synced ' + ts.toLocaleTimeString());
  });
  // Click pill to retry pull
  document.addEventListener('click', (e) => {
    const el = e.target.closest('#sync-pill');
    if (!el) return;
    el.textContent = 'Syncing...';
    if (window.MeasureSync && window.MeasureSync.pullNow) {
      window.MeasureSync.pullNow().finally(()=>{
        const ts = new Date(); el.textContent = 'Synced ' + ts.toLocaleTimeString();
      });
    }
  });
})();
