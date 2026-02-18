function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

const exportBtn = document.getElementById('export-json');
const restoreBtn = document.getElementById('restore-btn');
const restoreFile = document.getElementById('restore-file');
const statusEl = document.getElementById('restore-status');

exportBtn.addEventListener('click', () => {
  const customers = JSON.parse(localStorage.getItem('customers') || '[]');
  const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
  download(`measurepro-backup-${stamp}.json`, JSON.stringify(customers, null, 2));
});

restoreBtn.addEventListener('click', async () => {
  const file = restoreFile.files && restoreFile.files[0];
  if (!file) {
    statusEl.textContent = 'Please choose a backup file first.';
    return;
  }
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Invalid backup format');
    const ok = confirm('Restore will replace all existing customers. Continue?');
    if (!ok) return;
    // Ensure ids
    data.forEach(c => {
      if (!c.id) c.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    });
    localStorage.setItem('customers', JSON.stringify(data));
    statusEl.textContent = 'Restore complete. Redirecting to Clients...';
    setTimeout(() => { window.location.href = 'clients.html'; }, 800);
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Restore failed: ' + e.message;
  }
});

