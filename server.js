const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// ---- Grades ----

app.get('/api/grades', (req, res) => {
  res.json(db.getGrades());
});

app.post('/api/grades', (req, res) => {
  const { name, pricePerGallon } = req.body || {};
  if (!isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!isFiniteNumber(pricePerGallon) || pricePerGallon < 0) {
    return res.status(400).json({ error: 'pricePerGallon must be a non-negative number' });
  }
  const grade = db.addGrade({ name: name.trim(), pricePerGallon });
  res.status(201).json(grade);
});

app.put('/api/grades/:id', (req, res) => {
  const { pricePerGallon } = req.body || {};
  if (!isFiniteNumber(pricePerGallon) || pricePerGallon < 0) {
    return res.status(400).json({ error: 'pricePerGallon must be a non-negative number' });
  }
  const grade = db.updateGradePrice(req.params.id, pricePerGallon);
  if (!grade) {
    return res.status(404).json({ error: 'grade not found' });
  }
  res.json(grade);
});

app.delete('/api/grades/:id', (req, res) => {
  const ok = db.deleteGrade(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: 'grade not found' });
  }
  res.status(204).end();
});

// ---- Shifts ----

app.get('/api/shifts', (req, res) => {
  res.json(db.getShifts());
});

app.get('/api/shifts/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'invalid shift id' });
  }
  const shift = db.getShift(id);
  if (!shift) {
    return res.status(404).json({ error: 'shift not found' });
  }
  res.json(shift);
});

app.post('/api/shifts', (req, res) => {
  const { date, label, readings } = req.body || {};

  if (!isNonEmptyString(date) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date is required in YYYY-MM-DD format' });
  }
  if (label !== undefined && typeof label !== 'string') {
    return res.status(400).json({ error: 'label must be a string' });
  }
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'readings must be a non-empty array' });
  }

  const grades = db.getGrades();
  const gradeIds = new Set(grades.map((g) => g.id));
  const seenGradeIds = new Set();

  for (const r of readings) {
    if (!r || !isNonEmptyString(r.gradeId)) {
      return res.status(400).json({ error: 'each reading requires a gradeId' });
    }
    if (!gradeIds.has(r.gradeId)) {
      return res.status(400).json({ error: `unknown gradeId: ${r.gradeId}` });
    }
    if (seenGradeIds.has(r.gradeId)) {
      return res.status(400).json({ error: `duplicate reading for gradeId: ${r.gradeId}` });
    }
    seenGradeIds.add(r.gradeId);
    if (!isFiniteNumber(r.opening) || r.opening < 0) {
      return res.status(400).json({ error: `opening reading for ${r.gradeId} must be a non-negative number` });
    }
    if (!isFiniteNumber(r.closing) || r.closing < 0) {
      return res.status(400).json({ error: `closing reading for ${r.gradeId} must be a non-negative number` });
    }
    if (r.closing < r.opening) {
      return res.status(400).json({ error: `closing reading for ${r.gradeId} cannot be less than opening reading` });
    }
  }

  const shift = db.addShift({ date, label: label ? label.trim() : '', readings });
  res.status(201).json(shift);
});

// ---- Summary ----

app.get('/api/summary/daily', (req, res) => {
  const { date } = req.query;
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }
  res.json(db.getDailySummary(date));
});

app.listen(PORT, () => {
  console.log(`Gas station fuel tracker listening on port ${PORT}`);
});
