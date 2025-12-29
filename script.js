// -----------------------------
// CONFIG
// -----------------------------
const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// Numeric columns that make sense on axes
const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

// Binary clinical-condition columns (0/1)
const CONDITION_COLS = {
  anaemia: "anaemia",
  diabetes: "diabetes",
  highBP: "high_blood_pressure",
  smoking: "smoking"
};

// Expected labels in your cleaned dataset
const SEX_COL = "sex_label";       // "Female" / "Male"
const OUTCOME_COL = "death_label"; // "Survived" / "Died"

// -----------------------------
// HELPERS
// -----------------------------
function parseCSV(text) {
  // simple CSV parser (handles commas, no quoted commas support needed for this dataset)
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",");
    if (parts.length !== headers.length) continue;

    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const raw = parts[j].trim();

      // convert numeric fields if possible
      const num = Number(raw);
      obj[key] = Number.isFinite(num) && raw !== "" ? num : raw;
    }
    rows.push(obj);
  }
  return rows;
}

function setStatus(msg) {
  const el = document.getElementById("status");
  if (el) el.textContent = msg || "";
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function getSelectValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : null;
}

function populateSelect(selectId, options, defaultValue) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt.replaceAll("_", " ");
    sel.appendChild(o);
  }
  if (defaultValue && options.includes(defaultValue)) {
    sel.value = defaultValue;
  } else {
    sel.value = options[0];
  }
}

// -----------------------------
// MAIN
// -----------------------------
let RAW = [];
let currentLayout = null;

async function loadData() {
  setStatus("Loading dataset...");
  const res = await fetch(DATA_FILE);
  if (!res.ok) throw new Error(`Cannot load ${DATA_FILE} (HTTP ${res.status})`);
  const text = await res.text();
  RAW = parseCSV(text);

  setStatus(`Loaded ${RAW.length} rows.`);
}

function applyFilters(rows) {
  // Sex filter (if both unchecked -> show none)
  const sexFemale = getChecked("sexFemale");
  const sexMale = getChecked("sexMale");

  // Outcome filter (if both unchecked -> show none)
  const outSurv = getChecked("outcomeSurvived");
  const outDied = getChecked("outcomeDied");

  // Condition filters: if a condition checkbox is checked, require col == 1
  const requireAnaemia = getChecked("anaemia");
  const requireDiabetes = getChecked("diabetes");
  const requireHighBP = getChecked("highBP");
  const requireSmoking = getChecked("smoking");

  return rows.filter(r => {
    // sex
    const sexOk =
      (sexFemale && r[SEX_COL] === "Female") ||
      (sexMale && r[SEX_COL] === "Male");
    if (!sexOk) return false;

    // outcome
    const outOk =
      (outSurv && r[OUTCOME_COL] === "Survived") ||
      (outDied && r[OUTCOME_COL] === "Died");
    if (!outOk) return false;

    // conditions
    if (requireAnaemia && Number(r[CONDITION_COLS.anaemia]) !== 1) return false;
    if (requireDiabetes && Number(r[CONDITION_COLS.diabetes]) !== 1) return false;
    if (requireHighBP && Number(r[CONDITION_COLS.highBP]) !== 1) return false;
    if (requireSmoking && Number(r[CONDITION_COLS.smoking]) !== 1) return false;

    return true;
  });
}

function buildTraces(filtered, xCol, yCol) {
  // split into two traces: Survived vs Died
  const surv = filtered.filter(r => r[OUTCOME_COL] === "Survived");
  const died = filtered.filter(r => r[OUTCOME_COL] === "Died");

  function makeTrace(arr, name) {
    return {
      type: "scatter",
      mode: "markers",
      name,
      x: arr.map(r => Number(r[xCol])).filter(v => Number.isFinite(v)),
      y: arr.map(r => Number(r[yCol])).filter(v => Number.isFinite(v)),
      marker: { size: 10, opacity: 0.85 },
      hovertemplate:
        `<b>${name}</b><br>` +
        `${xCol}: %{x}<br>` +
        `${yCol}: %{y}<br>` +
        `sex: %{customdata[0]}<br>` +
        `<extra></extra>`,
      customdata: arr.map(r => [r[SEX_COL]])
    };
  }

  return [makeTrace(surv, "Survived"), makeTrace(died, "Died")];
}

function drawPlot() {
  const xCol = getSelectValue("xSelect");
  const yCol = getSelectValue("ySelect");

  const filtered = applyFilters(RAW);

  const traces = buildTraces(filtered, xCol, yCol);

  const layout = {
    margin: { l: 70, r: 30, t: 20, b: 70 },
    xaxis: { title: xCol.replaceAll("_", " "), zeroline: false },
    yaxis: { title: yCol.replaceAll("_", " "), zeroline: false },
    legend: { orientation: "h", y: -0.15 },
    dragmode: "zoom"
  };

  const config = {
    responsive: true,
    displaylogo: false
  };

  currentLayout = layout;
  Plotly.newPlot("plot", traces, layout, config);

  // IMPORTANT: we do NOT show "Showing x / y records" anywhere.
  setStatus(`Displayed ${filtered.length} points (filtered).`);
}

function wireEvents() {
  const ids = [
    "xSelect", "ySelect",
    "sexFemale", "sexMale",
    "outcomeSurvived", "outcomeDied",
    "anaemia", "diabetes", "highBP", "smoking"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("change", () => drawPlot());
  });

  document.getElementById("resetZoom").addEventListener("click", () => {
    // reset to autorange
    Plotly.relayout("plot", {
      "xaxis.autorange": true,
      "yaxis.autorange": true
    });
  });
}

async function init() {
  try {
    await loadData();

    // populate dropdowns + choose defaults that match your screenshot feel
    populateSelect("xSelect", NUMERIC_COLS, "serum_sodium");
    populateSelect("ySelect", NUMERIC_COLS, "age");

    wireEvents();
    drawPlot();
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
}

init();
