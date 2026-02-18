// clients.js — loads customers from localStorage, renders cards, and provides search

const listEl = document.getElementById('customer-list');
const searchInput = document.getElementById('search');
const clearBtn = document.getElementById('clear-search');
const modal = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const closeModalBtn = document.getElementById('close-modal');
const deleteBtn = document.getElementById('delete-customer');
const suggestionsEl = document.getElementById('search-suggestions');
const editBtn = document.getElementById('edit-customer');
const saveBtn = document.getElementById('save-customer');
const cancelEditBtn = document.getElementById('cancel-edit');

let customers = JSON.parse(localStorage.getItem('customers')) || [];
function persist() {
  localStorage.setItem('customers', JSON.stringify(customers));
}
function ensureIds() {
  let changed = false;
  customers.forEach(c => {
    if (!c.id) {
      c.id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
      changed = true;
    }
  });
  if (changed) persist();
}
ensureIds();

// Friendly label map for some short keys
const labelMap = {
  sr: 'Sleeve Round',
  hl: 'Half Length',
  ubr: 'UBR',
  nl: 'Neckline',
  os: 'Off Shoulder',
  bh: 'Blouse Hip',
  bl: 'Blouse Length',
  fc: 'Four Corner',
  bp: 'Breast Point',
  sh: 'Skirt Hip',
  sl: 'Skirt Length',
  sw: 'Skirt Waist',
  tw: 'Trouser Waist',
  thigh: 'Thigh',
  bc: 'Breast Cup',
  n2n: 'NIP-2-NIP',
  lw: 'Low Waist',
  fl1: 'Full Length 1',
  fl2: 'Full Length 2',
  fl3: 'Full Length 3',
  fl4: 'Full Length 4'
};

const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function friendlyLabel(key) {
  const k = String(key);
  const lk = k.toLowerCase();
  if (labelMap[lk]) return labelMap[lk];
  return capitalize(k.replace(/[-_]/g, ' '));
}

function renderCustomers(data = customers) {
  listEl.innerHTML = '';
  if (!data.length) {
    listEl.innerHTML = '<p class="no-results">No customers found.</p>';
    return;
  }

  data.forEach(customer => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = customer.id;

    // Build measurements list (all keys except name/phone/date)
    const measurements = Object.entries(customer)
      .filter(([k]) => !['name', 'phone', 'date', 'notes', 'id'].includes(k))
      .map(([k, v]) => `${friendlyLabel(k)}: ${v}`)
      .join(' | ');

    const notes = customer.notes ? `<p class="notes">Notes: ${customer.notes}</p>` : '';

    card.innerHTML = `
      <h3>${customer.name || 'Unnamed'}</h3>
      <p>${measurements}</p>
      ${notes}
      <small>Last Measured: ${customer.date || ''} ${customer.phone ? '• ' + customer.phone : ''}</small>
    `;

    listEl.appendChild(card);
  });
}

function normalizeString(s) {
  return String(s || '').toLowerCase();
}

function matchesQuery(customer, q) {
  if (!q) return true;
  q = q.toLowerCase();
  // check name and phone quickly
  if (normalizeString(customer.name).includes(q)) return true;
  if (normalizeString(customer.phone).includes(q)) return true;
  // check any measurement value
  for (const [, v] of Object.entries(customer)) {
    if (normalizeString(v).includes(q)) return true;
  }
  return false;
}

function buildSuggestions(q) {
  if (!q) return [];
  const L = q.toLowerCase();
  const out = [];
  customers.forEach(c => {
    let hit = false;
    let sub = '';
    if (normalizeString(c.name).includes(L)) {
      hit = true; sub = c.phone ? c.phone : '';
    }
    if (!hit && normalizeString(c.phone).includes(L)) {
      hit = true; sub = c.phone;
    }
    if (!hit) {
      for (const [k, v] of Object.entries(c)) {
        if (['id','name','phone','date','notes'].includes(k)) continue;
        if (normalizeString(v).includes(L)) {
          hit = true; sub = `${friendlyLabel(k)}: ${v}`; break;
        }
      }
    }
    if (hit) out.push({ id: c.id, title: c.name || 'Unnamed', sub });
  });
  return out.slice(0, 8);
}

searchInput.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  const filtered = customers.filter(c => matchesQuery(c, q));
  renderCustomers(filtered);
  const sug = buildSuggestions(q);
  if (!sug.length) {
    suggestionsEl.style.display = 'none';
    suggestionsEl.innerHTML = '';
  } else {
    suggestionsEl.innerHTML = sug.map(s => `
      <li data-id="${s.id}">
        <div class="suggestion-title">${s.title}</div>
        ${s.sub ? `<div class="suggestion-sub">${s.sub}</div>` : ''}
      </li>`).join('');
    suggestionsEl.style.display = '';
  }
});

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  renderCustomers(customers);
  suggestionsEl.style.display = 'none';
  suggestionsEl.innerHTML = '';
});

function openModalById(id) {
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  modalTitle.textContent = customer.name || 'Customer';
  modalBody.innerHTML = buildDetails(customer);
  deleteBtn.dataset.id = id;
  editBtn.dataset.id = id;
  saveBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  editBtn.style.display = '';
  deleteBtn.style.display = '';
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  deleteBtn.removeAttribute('data-id');
}

listEl.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;
  if (id) openModalById(id);
});

modalClose.addEventListener('click', closeModal);
closeModalBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) closeModal();
});

suggestionsEl.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.getAttribute('data-id');
  if (id) {
    openModalById(id);
    suggestionsEl.style.display = 'none';
  }
});

document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== searchInput) {
    suggestionsEl.style.display = 'none';
  }
});

function buildDetails(customer) {
  const entries = Object.entries(customer)
    .filter(([k]) => !['id', 'name', 'date'].includes(k));
  const list = entries.map(([k, v]) => `<div class="card" style="margin-bottom:8px"><strong>${friendlyLabel(k)}:</strong> ${v}</div>`).join('');
  const meta = `<small>${customer.date ? 'Last Measured: ' + customer.date : ''} ${customer.phone ? '• ' + customer.phone : ''}</small>`;
  return `${list}${customer.notes ? '<p class="notes">Notes: ' + customer.notes + '</p>' : ''}${meta}`;
}

// initial render and optional prefilled query via URL
renderCustomers();
try {
  const url = new URL(window.location.href);
  const q = url.searchParams.get('q');
  if (q) {
    searchInput.value = q;
    const filtered = customers.filter(c => matchesQuery(c, q));
    renderCustomers(filtered);
  }
} catch(_){}

function buildEditForm(customer) {
  const keys = Object.keys(customer).filter(k => !['id','date'].includes(k));
  const html = keys.map(k => {
    const label = friendlyLabel(k);
    const type = ['name','phone','notes'].includes(k) ? 'text' : 'number';
    return `
      <div class="input-group">
        <label for="edit-${k}">${label}</label>
        <input id="edit-${k}" name="${k}" type="${type}" value="${customer[k] ?? ''}">
      </div>`;
  }).join('');
  return `<form id="edit-form" class="form-grid">${html}</form>`;
}

editBtn.addEventListener('click', () => {
  const id = editBtn.dataset.id;
  if (!id) return;
  const customer = customers.find(c => c.id === id);
  if (!customer) return;
  modalBody.innerHTML = buildEditForm(customer);
  saveBtn.style.display = '';
  cancelEditBtn.style.display = '';
  editBtn.style.display = 'none';
  deleteBtn.style.display = 'none';
});

cancelEditBtn.addEventListener('click', () => {
  const id = editBtn.dataset.id;
  if (!id) return closeModal();
  const customer = customers.find(c => c.id === id);
  if (!customer) return closeModal();
  modalBody.innerHTML = buildDetails(customer);
  saveBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  editBtn.style.display = '';
  deleteBtn.style.display = '';
});

saveBtn.addEventListener('click', () => {
  const id = editBtn.dataset.id;
  if (!id) return;
  const idx = customers.findIndex(c => c.id === id);
  if (idx === -1) return;
  const formEl = document.getElementById('edit-form');
  if (!formEl) return;
  const updated = { ...customers[idx] };
  Array.from(formEl.elements).forEach(el => {
    if (!el.name) return;
    if (el.type === 'submit' || el.type === 'button') return;
    updated[el.name] = el.value;
  });
  updated.date = new Date().toLocaleDateString();
  customers[idx] = updated;
  persist();
  const q = searchInput.value.trim();
  const filtered = customers.filter(c => matchesQuery(c, q));
  renderCustomers(filtered);
  modalBody.innerHTML = buildDetails(updated);
  saveBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  editBtn.style.display = '';
  deleteBtn.style.display = '';
});

deleteBtn.addEventListener('click', () => {
  const id = deleteBtn.dataset.id;
  if (!id) return;
  const ok = confirm("Are you sure you want to delete? Once you delete, you cannot recover customers information and will have to re-enter again.");
  if (!ok) return;
  customers = customers.filter(c => c.id !== id);
  persist();
  renderCustomers(customers);
  closeModal();
  if (window.MeasureSync && window.MeasureSync.pushNow) window.MeasureSync.pushNow(customers);
});

renderCustomers();

// Focus search on page load
setTimeout(() => { try { searchInput.focus(); } catch(_){} }, 0);

// re-render when remote updates arrive
window.addEventListener('measure-sync-updated', () => {
  customers = JSON.parse(localStorage.getItem('customers')) || [];
  const q = searchInput.value.trim();
  const filtered = customers.filter(c => matchesQuery(c, q));
  renderCustomers(filtered);
});
