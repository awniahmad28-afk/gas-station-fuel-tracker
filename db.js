const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

const DEFAULT_DATA = {
  grades: [
    { id: 'regular', name: 'Regular', pricePerGallon: 3.29 },
    { id: 'mid', name: 'Mid', pricePerGallon: 3.59 },
    { id: 'premium', name: 'Premium', pricePerGallon: 3.89 },
    { id: 'diesel', name: 'Diesel', pricePerGallon: 3.99 }
  ],
  shifts: [],
  nextShiftId: 1
};

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  if (!raw.trim()) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  return JSON.parse(raw);
}

function save(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'grade';
}

function uniqueId(base, existingIds) {
  let id = base;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

// ---- Grades ----

function getGrades() {
  const data = load();
  return data.grades;
}

function addGrade({ name, pricePerGallon }) {
  const data = load();
  const existingIds = new Set(data.grades.map((g) => g.id));
  const id = uniqueId(slugify(name), existingIds);
  const grade = { id, name, pricePerGallon: round2(pricePerGallon) };
  data.grades.push(grade);
  save(data);
  return grade;
}

function updateGradePrice(id, pricePerGallon) {
  const data = load();
  const grade = data.grades.find((g) => g.id === id);
  if (!grade) return null;
  grade.pricePerGallon = round2(pricePerGallon);
  save(data);
  return grade;
}

function deleteGrade(id) {
  const data = load();
  const idx = data.grades.findIndex((g) => g.id === id);
  if (idx === -1) return false;
  data.grades.splice(idx, 1);
  save(data);
  return true;
}

// ---- Shifts ----

function getShifts() {
  const data = load();
  return data.shifts.slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.id - a.id;
  });
}

function getShift(id) {
  const data = load();
  return data.shifts.find((s) => s.id === Number(id)) || null;
}

function addShift({ date, label, readings }) {
  const data = load();
  const gradesById = new Map(data.grades.map((g) => [g.id, g]));

  const lineItems = readings.map((r) => {
    const grade = gradesById.get(r.gradeId);
    const gallons = round2(r.closing - r.opening);
    const revenue = round2(gallons * grade.pricePerGallon);
    return {
      gradeId: grade.id,
      gradeName: grade.name,
      pricePerGallon: grade.pricePerGallon,
      opening: r.opening,
      closing: r.closing,
      gallons,
      revenue
    };
  });

  const totalGallons = round2(lineItems.reduce((sum, li) => sum + li.gallons, 0));
  const totalRevenue = round2(lineItems.reduce((sum, li) => sum + li.revenue, 0));

  const shift = {
    id: data.nextShiftId,
    date,
    label: label || '',
    lineItems,
    totalGallons,
    totalRevenue,
    createdAt: new Date().toISOString()
  };

  data.nextShiftId += 1;
  data.shifts.push(shift);
  save(data);
  return shift;
}

// ---- Summary ----

function getDailySummary(date) {
  const data = load();
  const shifts = date ? data.shifts.filter((s) => s.date === date) : data.shifts.slice();

  const gradeTotals = new Map();
  let totalGallons = 0;
  let totalRevenue = 0;

  shifts.forEach((shift) => {
    shift.lineItems.forEach((li) => {
      totalGallons += li.gallons;
      totalRevenue += li.revenue;
      const existing = gradeTotals.get(li.gradeId) || {
        gradeId: li.gradeId,
        gradeName: li.gradeName,
        gallons: 0,
        revenue: 0
      };
      existing.gallons += li.gallons;
      existing.revenue += li.revenue;
      gradeTotals.set(li.gradeId, existing);
    });
  });

  const byGrade = Array.from(gradeTotals.values()).map((g) => ({
    ...g,
    gallons: round2(g.gallons),
    revenue: round2(g.revenue)
  }));

  return {
    date: date || null,
    shiftCount: shifts.length,
    totalGallons: round2(totalGallons),
    totalRevenue: round2(totalRevenue),
    byGrade
  };
}

module.exports = {
  getGrades,
  addGrade,
  updateGradePrice,
  deleteGrade,
  getShifts,
  getShift,
  addShift,
  getDailySummary
};
