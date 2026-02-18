const addBtn = document.getElementById('add-btn');
const formSection = document.getElementById('add-customer-form');

addBtn.addEventListener('click',() =>{
    if (formSection.style.display === "none" || formSection.style.display === ""){
        formSection.style.display = "block";
    } else {
        formSection.style.display = "none";
    }
});
const form = document.getElementById('customer-form');
const customerList = document.querySelector('.customer-list');
const modal = document.getElementById('detail-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const closeModalBtn = document.getElementById('close-modal');
const deleteBtn = document.getElementById('delete-customer');
const editBtn = document.getElementById('edit-customer');
const saveBtn = document.getElementById('save-customer');
const cancelEditBtn = document.getElementById('cancel-edit');

// Load existing customers from localStorage when page loads
let customers = JSON.parse(localStorage.getItem('customers')) || [];

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

function persist() {
  localStorage.setItem('customers', JSON.stringify(customers));
}

function ensureIds() {
  let changed = false;
  customers.forEach(c => {
    if (!c.id) {
      c.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      changed = true;
    }
  });
  if (changed) persist();
}
ensureIds();

// Function to render customers
function renderCustomers() {
  customerList.innerHTML = '';
  customers.forEach(customer => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = customer.id;
    const measurements = Object.entries(customer)
      .filter(([key]) => !['name', 'phone', 'date', 'notes', 'id'].includes(key))
      .map(([key, value]) => `${friendlyLabel(key)}: ${value}`)
      .join(' | ');
    const notes = customer.notes ? `<p class="notes">Notes: ${customer.notes}</p>` : '';
    card.innerHTML = `
      <h3>${customer.name || 'Unnamed'}</h3>
      <p>${measurements}</p>
      ${notes}
      <small>Last Measured: ${customer.date || ''} ${customer.phone ? '• ' + customer.phone : ''}</small>
    `;
    customerList.appendChild(card);
  });
}

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

function buildDetails(customer) {
  const entries = Object.entries(customer)
    .filter(([k]) => !['id', 'name', 'date'].includes(k));
  const list = entries.map(([k, v]) => `<div class="card" style="margin-bottom:8px"><strong>${friendlyLabel(k)}:</strong> ${v}</div>`).join('');
  const meta = `<small>${customer.date ? 'Last Measured: ' + customer.date : ''} ${customer.phone ? '• ' + customer.phone : ''}</small>`;
  return `${list}${customer.notes ? '<p class="notes">Notes: ' + customer.notes + '</p>' : ''}${meta}`;
}

function numericKeys() {
  return ['bust','waist','hip','shoulder','sr','hl','sleeve','ubr','nl','buba','os','bh','bl','fc','bp','sh','sl','sw','tw','trouser','thigh','bc','n2n','lw','fl1','fl2','fl3','fl4'];
}

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

renderCustomers();

// Handle form submission
form.addEventListener('submit', (e) => {
  e.preventDefault(); // prevent page refresh

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Collect form values dynamically so JS doesn't need updating for each new field
  const newCustomer = {};
  Array.from(form.elements).forEach(el => {
    if (!el.name) return;
    if (el.type === 'submit' || el.type === 'button') return;
    if (el.disabled) return;
    newCustomer[el.name] = el.value;
  });

  newCustomer.date = new Date().toLocaleDateString();
  newCustomer.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  customers.push(newCustomer);
  persist();
  if (window.MeasureSync && window.MeasureSync.pushNow) window.MeasureSync.pushNow(customers);

  renderCustomers();

  form.reset();

  document.getElementById('add-customer-form').style.display = 'none';
});

customerList.addEventListener('click', (e) => {
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

deleteBtn.addEventListener('click', () => {
  const id = deleteBtn.dataset.id;
  if (!id) return;
  const ok = confirm("Are you sure you want to delete? Once you delete, you cannot recover customers information and will have to re-enter again.");
  if (!ok) return;
  customers = customers.filter(c => c.id !== id);
  persist();
  renderCustomers();
  closeModal();
  if (window.MeasureSync && window.MeasureSync.pushNow) window.MeasureSync.pushNow(customers);
});

// Navigate to Clients search
const searchBtnEl = document.getElementById('search-customers-btn') || document.querySelector('.search-btn');
const searchOverlay = document.getElementById('search-overlay');
const searchOverlayClose = document.getElementById('search-close');
const homeSearchInput = document.getElementById('home-search');
const homeSuggestions = document.getElementById('home-suggestions');
const homeSearchClear = document.getElementById('home-search-clear');

if (searchBtnEl) {
  searchBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    if (searchOverlay) {
      searchOverlay.classList.remove('hidden');
      setTimeout(() => homeSearchInput && homeSearchInput.focus(), 0);
      buildAndRenderHomeSuggestions('');
    } else {
      window.location.assign('clients.html');
    }
  });
}

function buildSuggestionsList(q) {
  const L = (q || '').toLowerCase();
  const out = [];
  customers.forEach(c => {
    let hit = false;
    let sub = '';
    if (String(c.name||'').toLowerCase().includes(L)) { hit = true; sub = c.phone || ''; }
    if (!hit && String(c.phone||'').toLowerCase().includes(L)) { hit = true; sub = c.phone || ''; }
    if (!hit) {
      for (const [k, v] of Object.entries(c)) {
        if (['id','name','phone','date','notes'].includes(k)) continue;
        if (String(v||'').toLowerCase().includes(L)) { hit = true; sub = `${friendlyLabel(k)}: ${v}`; break; }
      }
    }
    if (hit || !L) out.push({ id: c.id, title: c.name || 'Unnamed', sub });
  });
  return out.slice(0, 8);
}

function buildAndRenderHomeSuggestions(q) {
  if (!homeSuggestions) return;
  const list = buildSuggestionsList(q);
  if (!list.length) {
    homeSuggestions.style.display = 'none';
    homeSuggestions.innerHTML = '';
    return;
  }
  homeSuggestions.innerHTML = list.map(s => `
    <li data-id="${s.id}">
      <div class="suggestion-title">${s.title}</div>
      ${s.sub ? `<div class="suggestion-sub">${s.sub}</div>` : ''}
    </li>`).join('');
  homeSuggestions.style.display = '';
}

if (homeSearchInput) {
  homeSearchInput.addEventListener('input', (e) => {
    buildAndRenderHomeSuggestions(e.target.value.trim());
  });
}

if (homeSuggestions) {
  homeSuggestions.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const id = li.getAttribute('data-id');
    if (id) {
      openModalById(id);
      searchOverlay.classList.add('hidden');
    }
  });
}

if (searchOverlay) {
  searchOverlay.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) searchOverlay.classList.add('hidden');
  });
}
if (searchOverlayClose) {
  searchOverlayClose.addEventListener('click', () => searchOverlay.classList.add('hidden'));
}

if (homeSearchClear && homeSearchInput) {
  homeSearchClear.addEventListener('click', () => {
    homeSearchInput.value = '';
    buildAndRenderHomeSuggestions('');
    homeSearchInput.focus();
  });
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
  renderCustomers();
  modalBody.innerHTML = buildDetails(updated);
  saveBtn.style.display = 'none';
  cancelEditBtn.style.display = 'none';
  editBtn.style.display = '';
  deleteBtn.style.display = '';
  if (window.MeasureSync && window.MeasureSync.pushNow) window.MeasureSync.pushNow(customers);
});

// re-render when remote updates arrive
window.addEventListener('measure-sync-updated', () => {
  customers = JSON.parse(localStorage.getItem('customers')) || [];
  renderCustomers();
});
