(function () {
  const state = {
    grades: []
  };

  // ---- Tabs ----

  function initTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

        if (btn.dataset.tab === 'history') loadHistory();
        if (btn.dataset.tab === 'summary') loadSummary();
        if (btn.dataset.tab === 'new-shift') renderReadingsTable();
      });
    });
  }

  function setMessage(elId, text, type) {
    const el = document.getElementById(elId);
    el.textContent = text || '';
    el.className = 'message' + (type ? ` ${type}` : '');
  }

  function formatMoney(n) {
    return `$${Number(n).toFixed(2)}`;
  }

  function formatGallons(n) {
    return Number(n).toFixed(2);
  }

  async function api(path, options) {
    const res = await fetch(path, options);
    let body = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (e) {
        body = null;
      }
    }
    if (!res.ok) {
      const err = (body && body.error) || `Request failed (${res.status})`;
      throw new Error(err);
    }
    return body;
  }

  // ---- Grades ----

  async function loadGrades() {
    state.grades = await api('/api/grades');
    renderGradesTable();
  }

  function renderGradesTable() {
    const tbody = document.getElementById('grades-tbody');
    tbody.innerHTML = '';
    state.grades.forEach((grade) => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = grade.name;

      const priceTd = document.createElement('td');
      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.step = '0.01';
      priceInput.min = '0';
      priceInput.value = grade.pricePerGallon;
      priceTd.appendChild(priceInput);

      const actionTd = document.createElement('td');
      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', async () => {
        try {
          await api(`/api/grades/${grade.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pricePerGallon: Number(priceInput.value) })
          });
          setMessage('grades-message', `Updated price for ${grade.name}.`, 'success');
          await loadGrades();
        } catch (e) {
          setMessage('grades-message', e.message, 'error');
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'danger';
      deleteBtn.style.marginLeft = '0.5rem';
      deleteBtn.addEventListener('click', async () => {
        if (!confirm(`Delete grade "${grade.name}"?`)) return;
        try {
          await api(`/api/grades/${grade.id}`, { method: 'DELETE' });
          setMessage('grades-message', `Deleted ${grade.name}.`, 'success');
          await loadGrades();
        } catch (e) {
          setMessage('grades-message', e.message, 'error');
        }
      });

      actionTd.appendChild(saveBtn);
      actionTd.appendChild(deleteBtn);

      tr.appendChild(nameTd);
      tr.appendChild(priceTd);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
  }

  function initAddGradeForm() {
    document.getElementById('add-grade-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-grade-name').value.trim();
      const price = Number(document.getElementById('new-grade-price').value);
      try {
        await api('/api/grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, pricePerGallon: price })
        });
        document.getElementById('new-grade-name').value = '';
        document.getElementById('new-grade-price').value = '';
        setMessage('grades-message', `Added grade "${name}".`, 'success');
        await loadGrades();
      } catch (err) {
        setMessage('grades-message', err.message, 'error');
      }
    });
  }

  // ---- New Shift ----

  function renderReadingsTable() {
    const tbody = document.getElementById('readings-tbody');
    tbody.innerHTML = '';
    state.grades.forEach((grade) => {
      const tr = document.createElement('tr');
      tr.dataset.gradeId = grade.id;

      const nameTd = document.createElement('td');
      nameTd.textContent = grade.name;

      const openingTd = document.createElement('td');
      const openingInput = document.createElement('input');
      openingInput.type = 'number';
      openingInput.step = '0.01';
      openingInput.min = '0';
      openingInput.className = 'opening-input';
      openingTd.appendChild(openingInput);

      const closingTd = document.createElement('td');
      const closingInput = document.createElement('input');
      closingInput.type = 'number';
      closingInput.step = '0.01';
      closingInput.min = '0';
      closingInput.className = 'closing-input';
      closingTd.appendChild(closingInput);

      const gallonsTd = document.createElement('td');
      gallonsTd.className = 'gallons-cell';
      gallonsTd.textContent = '0.00';

      const revenueTd = document.createElement('td');
      revenueTd.className = 'revenue-cell';
      revenueTd.textContent = formatMoney(0);

      function recalc() {
        const opening = Number(openingInput.value) || 0;
        const closing = Number(closingInput.value) || 0;
        const gallons = Math.max(0, closing - opening);
        gallonsTd.textContent = formatGallons(gallons);
        revenueTd.textContent = formatMoney(gallons * grade.pricePerGallon);
      }

      openingInput.addEventListener('input', recalc);
      closingInput.addEventListener('input', recalc);

      tr.appendChild(nameTd);
      tr.appendChild(openingTd);
      tr.appendChild(closingTd);
      tr.appendChild(gallonsTd);
      tr.appendChild(revenueTd);
      tbody.appendChild(tr);
    });
  }

  function initNewShiftForm() {
    const dateInput = document.getElementById('shift-date');
    dateInput.value = new Date().toISOString().slice(0, 10);

    document.getElementById('new-shift-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const date = dateInput.value;
      const label = document.getElementById('shift-label').value.trim();
      const rows = document.querySelectorAll('#readings-tbody tr');

      const readings = [];
      rows.forEach((row) => {
        const gradeId = row.dataset.gradeId;
        const opening = row.querySelector('.opening-input').value;
        const closing = row.querySelector('.closing-input').value;
        if (opening === '' && closing === '') return;
        readings.push({
          gradeId,
          opening: Number(opening) || 0,
          closing: Number(closing) || 0
        });
      });

      if (readings.length === 0) {
        setMessage('new-shift-message', 'Enter at least one meter reading.', 'error');
        return;
      }

      try {
        const shift = await api('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, label, readings })
        });
        setMessage(
          'new-shift-message',
          `Shift saved: ${formatGallons(shift.totalGallons)} gal, ${formatMoney(shift.totalRevenue)} revenue.`,
          'success'
        );
        document.getElementById('shift-label').value = '';
        renderReadingsTable();
      } catch (err) {
        setMessage('new-shift-message', err.message, 'error');
      }
    });
  }

  // ---- History ----

  async function loadHistory() {
    try {
      const shifts = await api('/api/shifts');
      const tbody = document.getElementById('history-tbody');
      tbody.innerHTML = '';
      shifts.forEach((shift) => {
        const tr = document.createElement('tr');
        const dateTd = document.createElement('td');
        dateTd.textContent = shift.date;
        const labelTd = document.createElement('td');
        labelTd.textContent = shift.label || '-';
        const gallonsTd = document.createElement('td');
        gallonsTd.textContent = formatGallons(shift.totalGallons);
        const revenueTd = document.createElement('td');
        revenueTd.textContent = formatMoney(shift.totalRevenue);
        tr.appendChild(dateTd);
        tr.appendChild(labelTd);
        tr.appendChild(gallonsTd);
        tr.appendChild(revenueTd);
        tbody.appendChild(tr);
      });
      setMessage('history-message', shifts.length === 0 ? 'No shifts recorded yet.' : '', '');
    } catch (err) {
      setMessage('history-message', err.message, 'error');
    }
  }

  // ---- Summary ----

  async function loadSummary() {
    const date = document.getElementById('summary-date').value;
    try {
      const summary = await api(`/api/summary/daily${date ? `?date=${date}` : ''}`);
      const totalsEl = document.getElementById('summary-totals');
      totalsEl.innerHTML = `
        <div><strong>${formatGallons(summary.totalGallons)}</strong>Total Gallons</div>
        <div><strong>${formatMoney(summary.totalRevenue)}</strong>Total Revenue</div>
        <div><strong>${summary.shiftCount}</strong>Shifts</div>
      `;

      const tbody = document.getElementById('summary-tbody');
      tbody.innerHTML = '';
      summary.byGrade.forEach((g) => {
        const tr = document.createElement('tr');
        const nameTd = document.createElement('td');
        nameTd.textContent = g.gradeName;
        const gallonsTd = document.createElement('td');
        gallonsTd.textContent = formatGallons(g.gallons);
        const revenueTd = document.createElement('td');
        revenueTd.textContent = formatMoney(g.revenue);
        tr.appendChild(nameTd);
        tr.appendChild(gallonsTd);
        tr.appendChild(revenueTd);
        tbody.appendChild(tr);
      });

      setMessage('summary-message', summary.shiftCount === 0 ? 'No shifts for this period.' : '', '');
    } catch (err) {
      setMessage('summary-message', err.message, 'error');
    }
  }

  function initSummaryControls() {
    document.getElementById('summary-date').addEventListener('change', loadSummary);
    document.getElementById('summary-all-time').addEventListener('click', () => {
      document.getElementById('summary-date').value = '';
      loadSummary();
    });
  }

  // ---- Init ----

  async function init() {
    initTabs();
    initAddGradeForm();
    initNewShiftForm();
    initSummaryControls();
    await loadGrades();
    renderReadingsTable();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
