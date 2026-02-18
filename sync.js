;(function(){
  const KEY = 'cloudSyncConfig';
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
    try { await firebase.auth().signInAnonymously(); } catch(e) {}
    try { if (cfg.measurementId && firebase.analytics) firebase.analytics(); } catch(_){}
    return firebase.firestore();
  }
  function getCustomers(){ try { return JSON.parse(localStorage.getItem('customers')||'[]'); } catch { return []; } }
  function setCustomers(arr){ localStorage.setItem('customers', JSON.stringify(arr)); }
  function parseDate(d){ const t = Date.parse(d||''); return isNaN(t)?0:t; }
  function mergeCustomers(local, remote){
    const byId = new Map();
    const put = (c)=>{ if(!c.id) return; const ex=byId.get(c.id); if(!ex){ byId.set(c.id, c); return; } const a=parseDate(ex.date), b=parseDate(c.date); byId.set(c.id, b>=a?c:ex); };
    local.forEach(put); remote.forEach(put);
    return Array.from(byId.values());
  }
  async function pull(db, code){
    const snap = await db.collection('measurepro').doc(code).get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const remote = Array.isArray(data.customers)?data.customers:[];
    const merged = mergeCustomers(getCustomers(), remote);
    setCustomers(merged);
    window.dispatchEvent(new Event('measure-sync-updated'));
    return merged.length;
  }
  async function push(db, code, customers){
    await db.collection('measurepro').doc(code).set({ customers, updatedAt: Date.now() }, { merge: true });
  }
  async function initAndStart(){
    const cfg = readConfig();
    if (!cfg || !cfg.enabled || !cfg.apiKey || !cfg.projectId || !cfg.appId || !cfg.syncCode) return;
    try {
      const db = await ensureFirebase(cfg);
      await pull(db, cfg.syncCode);
      // real-time updates
      db.collection('measurepro').doc(cfg.syncCode).onSnapshot(async () => {
        await pull(db, cfg.syncCode);
      });
      window.MeasureSync = {
        isEnabled: true,
        async pushNow(list){ try { await push(db, cfg.syncCode, list||getCustomers()); } catch(e){} },
        async pullNow(){ try { await pull(db, cfg.syncCode); } catch(e){} }
      };
    } catch(e) {
      window.MeasureSync = { isEnabled:false };
    }
  }
  // kick on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAndStart);
  } else { initAndStart(); }

  // expose helpers for settings page
  window.__syncConfig = { readConfig, saveConfig, ensureFirebase };
})();
