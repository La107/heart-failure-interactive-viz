// -----------------------------
// Config
// -----------------------------
const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// Numeric columns that make sense on axes (edit if you want)
const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

// Binary columns used as filters (must exist in your CSV)
const BIN_COLS = {
  anaemia: "anaemia",
  diabetes: "diabetes",
  highBP: "high_blood_pressure",
  smoking: "smoking"
};

// Label columns you said you kept
const SEX_COL = "sex_label";       // values: Female/Male (or 0/1)
const OUTCOME_COL = "death_label"; // values: Survived/Died (or 0/1)

// -----------------------------
// Helpers
// -----------------------------
function parseCSV(text) {
  // Simple CSV parser (works well for Kaggle-style numeric CSVs without commas in fields)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(","); // ok for this dataset format
    if (parts.length !== headers.length) continue;

    const obj = {};
    headers.forEach((h, j) => {
      const raw = (parts[j] ?? "").trim();
      // keep strings for labels, parse numbers where possible
      const num = Number(raw);
      obj[h] = raw !== "" && !Number.isNaN(num) ? num : raw;
    });
    rows.push(obj);
  }

  return { headers, rows };
}

function normalizeSex(v) {
  // Accept: "Female"/"Male", "F"/"M", 0/1, etc.
  if (typeof v === "number") return v === 0 ? "Female" : "Male";
  const s = String(v).toLowerCase();
  if (s.startsWith("f")) return "Female";
  if (s.startsWith("m")) return "Male";
  return String(v);
}

function normalizeOutcome(v) {
  // Accept: "Survived"/"Died", 0/1, etc.
  if (typeof v === "number") return v === 0 ? "Survived" : "Died";
  const s = String(v).toLowerCase();
  if (s.includes("surv")) return "Survived";
  if (s.includes("die") || s.includes("dead")) return "Died";
  return String(v);
}

function prettyLabel(col) {
  return col.replaceAll("_", " ");
}

function getEl(id) {
  return document.getElementById(id);
}

// -----------------------------
// State
// -----------------------------
let DATA = [];

// -----------------------------
// UI setup
// -----------------------------
function populateSelect(selectEl, options, defaultValue) {
  selectEl.innerHTML = "";
  options.forEach(col => {
    const opt = document.createElement("option");
    opt.value = col;
    opt.textContent = prettyLabel(col);
    selectEl.appendChild(opt);
  });
  if (defaultValue && options.includes(defaultValue)) {
    selectEl.value = defaultValue;
  } else if (options.length) {
    selectEl.value = options[0];
  }
}

function readFilters() {
  const sexFemale = getEl("sexFemale").checked;
  const sexMale = getEl("sexMale").checked;

  const outSurvived = getEl("outcomeSurvived").checked;
  const outDied = getEl("outcomeDied").checked;

  // Clinical condition filters: apply only if checked
  const reqAnaemia = getEl("anaemia").checked;
  const reqDiabetes = getEl("diabetes").checked;
  const reqHighBP = getEl("highBP").checked;
  const reqSmoking = getEl("smoking").checked;

  return {
    sexAllowed: new Set([
      ...(sexFemale ? ["Female"] : []),
      ...(sexMale ? ["Male"] : [])
    ]),
    outcomeAllowed: new Set([
      ...(outSurvived ? ["Survived"] : []),
      ...(outDied ? ["Died"] : [])
    ]),
    require: {
      anaemia: reqAnaemia,
      diabetes: reqDiabetes,
      highBP: reqHighBP,
      smoking: reqSmoking
    }
  };
}

function applyFilters(rows, f) {
  return rows.filter(r => {
    const sex = normalizeSex(r[SEX_COL]);
    const outcome = normalizeOutcome(r[OUTCOME_COL]);

    if (!f.sexAllowed.has(sex)) return false;
    if (!f.outcomeAllowed.has(outcome)) return false;

    // apply clinical filters only if checked
    if (f.require.anaemia && Number(r[BIN_COLS.anaemia]) !== 1) return false;
    if (f.require.diabetes && Number(r[BIN_COLS.diabetes]) !== 1) return false;
    if (f.require.highBP && Number(r[BIN_COLS.highBP]) !== 1) return false;
    if (f.require.smoking && Number(r[BIN_COLS.smoking]) !== 1) return false;

    return true;
  });
}

// -----------------------------
// Plot
// -----------------------------
function drawPlot() {
  const xCol = getEl("xSelect").value;
  const yCol = getEl("ySelect").value;

  const filters = readFilters();
  const filtered = applyFilters(DATA, filters);

  const survivedX = [];
  const survivedY = [];
  const diedX = [];
  const diedY = [];

  filtered.forEach(r => {
    const x = Number(r[xCol]);
    const y = Number(r[yCol]);
    if (Number.isNaN(x) || Number.isNaN(y)) return;

    const outcome = normalizeOutcome(r[OUTCOME_COL]);
    if (outcome === "Survived") {
      survivedX.push(x);
      survivedY.push(y);
    } else {
      diedX.push(x);
      diedY.push(y);
    }
  });

  const traces = [
    {
      type: "scatter",
      mode: "markers",
      name: "Survived",
      x: survivedX,
      y: survivedY,
      marker: { size: 9, opacity: 0.85 }
    },
    {
      type: "scatter",
      mode: "markers",
      name: "Died",
      x: diedX,
      y: diedY,
      marker: { size: 9, opacity: 0.85 }
    }
  ];

  const layout = {
    margin: { l: 70, r: 30, t: 20, b: 70 },
    xaxis: { title: prettyLabel(xCol), zeroline: false },
    yaxis: { title: prettyLabel(yCol), zeroline: false },
    legend: { orientation: "h" },
    hovermode: "closest"
  };

  const config = {
    responsive: true,
    displaylogo: false
  };

  Plotly.newPlot("plot", traces, layout, config);

  // IMPORTANT: do NOT show any "Showing ... records" text
  getEl("status").textContent = "";
}

function resetZoom() {
  Plotly.relayout("plot", {
    "xaxis.autorange": true,
    "yaxis.autorange": true
  });
}

// -----------------------------
// Init
// -----------------------------
async function init() {
  const res = await fetch(DATA_FILE, { cache: "no-store" });
  if (!res.ok) {
    getEl("status").textContent = `Could not load ${DATA_FILE}. Check the filename in the repo.`;
    return;
  }

  const text = await res.text();
  const { rows } = parseCSV(text);

  // normalize label columns
  DATA = rows.map(r =>
