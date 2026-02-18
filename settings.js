const clearBtn = document.getElementById('clear-data');
const statusEl = document.getElementById('settings-status');

clearBtn.addEventListener('click', () => {
  const ok = confirm('Are you sure you want to delete? Once you delete, you cannot recover customers information and will have to re-enter again.');
  if (!ok) return;
  localStorage.removeItem('customers');
  statusEl.textContent = 'All customers deleted.';
});

