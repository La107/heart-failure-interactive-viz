// ------------------------------
// Config
// ------------------------------
const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// SOLO colonne numeriche sensate sugli assi (come nel tuo screenshot)
const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

// Colonne filtro (0/1)
const BINARY_FILTERS = [
  { id: "anaemia", col: "anaemia" },
  { id: "diabetes", col: "diabetes" },
  { id: "highBP", col: "high_blood_pressure" },
  { id: "smoking", col: "smoking" }
];

// Etichette (come le tue: sex_label e death_label)
const SEX_COL = "sex_label";        // "Female"/"Male"
const OUTCOME_COL = "death_label";  // "Survived"/"Died"

let rawData = [];

// ------------------------------
// Utils: CSV parser semplice
// (dataset Kaggle = CSV pulito, senza virgole dentro campi)
// ------------------------------
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(","); // ok per questo dataset
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = parts[idx];
    });
    rows.push(obj);
  }
  return rows;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ------------------------------
// UI
// ------------------------------
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");

function setUpAxisDropdowns() {
  // options
  for (const c of NUMERIC_COLS) {
    const ox = document.createElement("option");
    ox.value = c;
    ox.textContent = c.replaceAll("_", " ");
    xSelect.appendChild(ox);

    const oy = document.createElement("option");
    oy.value = c;
    oy.textContent = c.replaceAll("_", " ");
    ySelect.appendChild(oy);
  }

  // default (come nel tuo screenshot)
  xSelect.value = "serum_sodium";
  ySelect.value = "age";
}

function getCheckbox(id) {
  return document.getElementById(id).checked;
}

// ------------------------------
// Filtering + plot
// ------------------------------
function getFilteredData() {
  const allowedSex = new Set();
  if (getCheckbox("sexFemale")) allowedSex.add("Female");
  if (getCheckbox("sexMale")) allowedSex.add("Male");

  const allowedOutcome = new Set();
  if (getCheckbox("outcomeSurvived")) allowedOutcome.add("Survived");
  if (getCheckbox("outcomeDied")) allowedOutcome.add("Died");

  return rawData.filter(d => {
    // sex + outcome
    if (!allowedSex.has(d[SEX_COL])) return false;
    if (!allowedOutcome.has(d[OUTCOME_COL])) return false;

    // binary filters: se spunti, tieni solo 1
    for (const f of BINARY_FILTERS) {
      if (getCheckbox(f.id)) {
        if (String(d[f.col]) !== "1") return false;
      }
    }
    return true;
  });
}

funct
