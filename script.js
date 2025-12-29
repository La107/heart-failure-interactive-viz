// -------------------------------
// Config
// -------------------------------
const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// Numeric columns you want to allow on axes
const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

// Outcome + Sex labels (strings in your cleaned dataset)
const SEX_COL = "sex_label";       // "Female" / "Male"
const OUTCOME_COL = "death_label"; // "Survived" / "Died"

// Binary condition columns (0/1)
const CONDITION_COLS = {
  anaemia: "anaemia",
  diabetes: "diabetes",
  highBP: "high_blood_pressure",
  smoking: "smoking"
};

// -------------------------------
// DOM
// -------------------------------
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");

const sexFemale = document.getElementById("sexFemale");
const sexMale = document.getElementById("sexMale");

const outcomeSurvived = document.getElementById("outcomeSurvived");
const outcomeDied = document.getElementById("outcomeDied");

const anaemia = document.getElementById("anaemia");
const diabetes = document.getElementById("diabetes");
const highBP = document.getElementById("highBP");
const smoking = document.getElementById("smoking");

const resetZoomBtn = document.getElementById("resetZoom");

// -------------------------------
// State
// -------------------------------
let rawData = [];
let currentX = "serum_sodium";
let currentY = "age";

// -------------------------------
// Helpers
// -------------------------------
function prettyLabel(col) {
  return col.replaceAll("_", " ");
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isTruthyOne(v) {
  return String(v).trim() === "1";
}

// Filters:
// - Sex + Outcome: include categories checked
// - Conditions: if a condition checkbox is checked -> keep only rows where that condition == 1
function applyFilters(data) {
  const allowedSex = new Set();
  if (sexFemale.checked) allowedSex.add("Female");
  if (sexMale.checked) allowedSex.add("Male");

  const allowedOutcome = new Set();
  if (outcomeSurvived.checked) allowedOutcome.add("Survived");
  if (outcomeDied.checked) allowedOutcome.add("Died");

  return data.filter(d => {
    // sex/outcome inclusion
    if (!allowedSex.has(d[SEX_COL])) return false;
    if (!allowedOutcome.has(d[OUTCOME_COL])) return false;

    // conditions (checked = must be 1)
    if (anaemia.checked && !isTruthyOne(d[CONDITION_COLS.anaemia])) return false;
    if (diabetes.checked && !isTruthyOne(d[CONDITION_COLS.diabetes])) return false;
    if (highBP.checked && !isTruthyOne(d[CONDITION_COLS.highBP])) return false;
    if (smoking.checked && !isTruthyOne(d[CONDITION_COLS.smoking])) return false;

    // must have x/y numeric values
    const x = toNumber(d[currentX]);
    const y = toNumber(d[currentY]);
    if (x === null || y === null) return false;

    return true;
  });
}

function buildTraces(filtered) {
  const survivedX = [];
  const survivedY = [];
  const diedX = [];
  const diedY = [];

  for (const d of filtered) {
    const x = toNumber(d[currentX]);
    const y = toNumber(d[currentY]);
    if (x === null || y === null) continue;

    if (d[OUTCOME_COL] === "Survived") {
      survivedX.push(x);
      survivedY.push(y);
    } else if (d[OUTCOME_COL] === "Died") {
      diedX.push(x);
      diedY.push(y);
    }
  }

  return [
    {
      x: survivedX,
      y: survivedY,
      type: "scatter",
      mode: "markers",
      name: "Survived",
      marker: { size: 9, opacity: 0.85 }
    },
    {
      x: diedX,
      y: diedY,
      type: "scatter",
      mode: "markers",
      name: "Died",
      marker: { size: 9, opacity: 0.85 }
    }
  ];
}

function draw() {
  const filtered = applyFilters(rawData);
  const traces = buildTraces(filtered);

  const layout = {
    margin: { l: 70, r: 30, t: 30, b: 70 },
    xaxis: { title: prettyLabel(currentX), zeroline: false },
    yaxis: { title: prettyLabel(currentY), zeroline: false },
    legend: { orientation: "h", x: 0, y: -0.18 }
  };

  const config = {
    responsive: true,
    displayModeBar: true
  };

  Plotly.react("plot", traces, layout, config);
}

function populateDropdowns() {
  // fill X and Y dropdowns
  xSelect.innerHTML = "";
  ySelect.innerHTML = "";

  for (const col of NUMERIC_COLS) {
    const optX = document.createElement("option");
    optX.value = col;
    optX.textContent = prettyLabel(col);
    xSelect.appendChild(optX);

    const optY = document.createElement("option");
    optY.value = col;
    optY.textContent = prettyLabel(col);
    ySelect.appendChild(optY);
  }

  // defaults
  xSelect.value = currentX;
  ySelect.value = currentY;
}

function attachEvents() {
  xSelect.addEventListener("change", () => {
    currentX = xSelect.value;
    draw();
  });

  ySelect.addEventListener("change", () => {
    currentY = ySelect.value;
    draw();
  });

  [
    sexFemale, sexMale,
    outcomeSurvived, outcomeDied,
    anaemia, diabetes, highBP, smoking
  ].forEach(el => el.addEventListener("change", draw));

  resetZoomBtn.addEventListener("click", () => {
    Plotly.relayout("plot", { "xaxis.autorange": true, "yaxis.autorange": true });
  });
}

// -------------------------------
// Load data + init
// -------------------------------
Plotly.d3.csv(DATA_FILE, (err, rows) => {
  if (err) {
    console.error("Could not load CSV:", err);
    alert("Could not load the CSV file. Check that it is uploaded in the repo root and the filename matches exactly.");
    return;
  }

  rawData = rows;

  populateDropdowns();
  attachEvents();
  draw();
});
