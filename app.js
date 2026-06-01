/* ── State ────────────────────────────────────────────────── */
let patients = [];
let editingId = null;
let deletingId = null;

/* ── DOM refs ─────────────────────────────────────────────── */
const patientBody     = document.getElementById('patientBody');
const searchInput     = document.getElementById('searchInput');
const modalBackdrop   = document.getElementById('modalBackdrop');
const deleteBackdrop  = document.getElementById('deleteBackdrop');
const remarksBackdrop = document.getElementById('remarksBackdrop');
const modalTitle      = document.getElementById('modalTitle');
const formError       = document.getElementById('formError');
const btnSave         = document.getElementById('btnSave');
const btnSaveText     = document.getElementById('btnSaveText');
const btnSaveLoader   = document.getElementById('btnSaveLoader');

/* ── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', fetchPatients);

/* ── Fetch all ────────────────────────────────────────────── */
async function fetchPatients() {
  try {
    const res = await fetch('/api/patients');
    patients = await res.json();
    renderTable(patients);
    updateStats(patients);
  } catch (e) {
    showToast('Failed to load patients.', 'error');
  }
}

/* ── Render table ─────────────────────────────────────────── */
function renderTable(data) {
  patientBody.innerHTML = '';

  if (!data.length) {
    patientBody.innerHTML = `
      <tr id="emptyRow">
        <td colspan="8" class="empty-cell">
          <i class="fa-regular fa-folder-open"></i>
          <p>No patient records found.</p>
        </td>
      </tr>`;
    return;
  }

  data.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        <div class="patient-name">${esc(p.full_name)}</div>
        <div class="patient-email">${esc(p.email)}</div>
      </td>
      <td>${formatDob(p.dob)}</td>
      <td>${glucoseBadge(p.glucose)}</td>
      <td>${haemoBadge(p.haemoglobin)}</td>
      <td>${cholBadge(p.cholesterol)}</td>
      <td>
        <div class="remarks-cell" title="Click to view full analysis"
             onclick="openRemarks('${esc(p.full_name)}', \`${esc(p.remarks)}\`)">
          ${esc(p.remarks) || '<span style="opacity:.4">—</span>'}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Edit" onclick="openEdit(${p.id})">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-icon del" title="Delete" onclick="openDelete(${p.id}, '${esc(p.full_name)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>`;
    patientBody.appendChild(tr);
  });
}

/* ── Stats ────────────────────────────────────────────────── */
function updateStats(data) {
  document.getElementById('statTotal').textContent = data.length;
  const atRisk = data.filter(p =>
    p.glucose > 125 || p.glucose < 70 ||
    p.haemoglobin < 12 || p.haemoglobin > 17.5 ||
    p.cholesterol >= 240
  ).length;
  document.getElementById('statRisk').textContent = atRisk;
  document.getElementById('statNormal').textContent = data.length - atRisk;
}

/* ── Badges ───────────────────────────────────────────────── */
function glucoseBadge(v) {
  const cls = v < 70 || v > 125 ? 'badge-danger' : v > 99 ? 'badge-warn' : 'badge-normal';
  return `<span class="badge ${cls}">${v}</span>`;
}
function haemoBadge(v) {
  const cls = v < 12 || v > 17.5 ? 'badge-danger' : 'badge-normal';
  return `<span class="badge ${cls}">${v}</span>`;
}
function cholBadge(v) {
  const cls = v >= 240 ? 'badge-danger' : v >= 200 ? 'badge-warn' : 'badge-normal';
  return `<span class="badge ${cls}">${v}</span>`;
}

/* ── Modal: Add ───────────────────────────────────────────── */
document.getElementById('btnAdd').addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Add Patient';
  clearForm();
  openModal(modalBackdrop);
});

/* ── Modal: Edit ──────────────────────────────────────────── */
async function openEdit(id) {
  editingId = id;
  modalTitle.textContent = 'Edit Patient';
  clearForm();
  try {
    const res = await fetch(`/api/patients/${id}`);
    const p = await res.json();
    document.getElementById('fName').value    = p.full_name;
    document.getElementById('fDob').value     = p.dob;
    document.getElementById('fEmail').value   = p.email;
    document.getElementById('fGlucose').value = p.glucose;
    document.getElementById('fHaemo').value   = p.haemoglobin;
    document.getElementById('fChol').value    = p.cholesterol;
    openModal(modalBackdrop);
  } catch {
    showToast('Could not load patient data.', 'error');
  }
}

/* ── Save (Create / Update) ───────────────────────────────── */
document.getElementById('btnSave').addEventListener('click', async () => {
  hideError();
  const payload = {
    full_name:   document.getElementById('fName').value.trim(),
    dob:         document.getElementById('fDob').value,
    email:       document.getElementById('fEmail').value.trim(),
    glucose:     document.getElementById('fGlucose').value,
    haemoglobin: document.getElementById('fHaemo').value,
    cholesterol: document.getElementById('fChol').value,
  };

  setSaving(true);
  const url    = editingId ? `/api/patients/${editingId}` : '/api/patients';
  const method = editingId ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showError(Array.isArray(data.error) ? data.error.join('\n') : data.error);
      return;
    }

    closeModal(modalBackdrop);
    showToast(editingId ? 'Patient updated successfully.' : 'Patient added & analysed.', 'success');
    await fetchPatients();
  } catch {
    showError('Network error. Please try again.');
  } finally {
    setSaving(false);
  }
});

/* ── Delete ───────────────────────────────────────────────── */
function openDelete(id, name) {
  deletingId = id;
  document.getElementById('deletePatientName').textContent = name;
  openModal(deleteBackdrop);
}

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  try {
    await fetch(`/api/patients/${deletingId}`, { method: 'DELETE' });
    closeModal(deleteBackdrop);
    showToast('Patient record deleted.', 'success');
    await fetchPatients();
  } catch {
    showToast('Delete failed.', 'error');
  }
});

/* ── Remarks viewer ───────────────────────────────────────── */
function openRemarks(name, text) {
  document.getElementById('remarksFull').textContent = text || 'No remarks available.';
  openModal(remarksBackdrop);
}

/* ── Search ───────────────────────────────────────────────── */
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(q) ||
    p.email.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

/* ── Modal helpers ────────────────────────────────────────── */
function openModal(el)  { el.classList.add('open'); }
function closeModal(el) { el.classList.remove('open'); }

document.getElementById('modalClose').addEventListener('click',   () => closeModal(modalBackdrop));
document.getElementById('btnCancel').addEventListener('click',    () => closeModal(modalBackdrop));
document.getElementById('deleteClose').addEventListener('click',  () => closeModal(deleteBackdrop));
document.getElementById('deleteCancelBtn').addEventListener('click', () => closeModal(deleteBackdrop));
document.getElementById('remarksClose').addEventListener('click', () => closeModal(remarksBackdrop));

[modalBackdrop, deleteBackdrop, remarksBackdrop].forEach(bd => {
  bd.addEventListener('click', e => { if (e.target === bd) closeModal(bd); });
});

/* ── Utilities ────────────────────────────────────────────── */
function clearForm() {
  ['fName','fDob','fEmail','fGlucose','fHaemo','fChol'].forEach(id => {
    document.getElementById(id).value = '';
  });
  hideError();
}
function showError(msg)  { formError.textContent = msg; formError.classList.remove('hidden'); }
function hideError()     { formError.classList.add('hidden'); }
function setSaving(on)   {
  btnSave.disabled = on;
  btnSaveText.classList.toggle('hidden', on);
  btnSaveLoader.classList.toggle('hidden', !on);
}
function formatDob(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[+m - 1]} ${y}`;
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}