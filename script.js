// ------------------------------
// Config
// ------------------------------
const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// numeric columns that make sense on axes
const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

// binary 0/1 filters available (must exist in your cleaned CSV)
const BINARY_FILTERS = {
  anaemia: "fAnaemia",
  diabetes: "fDiabetes",
  high_blood_pressure: "fHBP",
  smoking: "fSmoking"
};

let rawData = [];

// ------------------------------
// Helpers
// ------------------------------
function $(id) { return document.getElementById(id); }

function parseRow(d) {
  // Convert numeric fields to numbers
  const row = { ...d };

  for (const c of NUMERIC_COLS) row[c] = +row[c];

  // Binary columns
  for (const c of Object.keys(BINARY_FILTERS)) row[c] = +row[c];

  // Labels (strings)
  row.sex_label = String(row.sex_label);
  row.death_label = String(row.death_label);

  return row;
}

function populateAxisDropdown(selectEl, cols, defaultValue) {
  selectEl.innerHTML = "";
  for (const c of cols) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c.replaceAll("_", " ");
    selectEl.appendChild(opt);
  }
  selectEl.value = defaultValue;
}

function currentSelections() {
  const sexAllowed = new Set();
  if ($("sexFemale").checked) sexAllowed.add("Female");
  if ($("sexMale").checked) sexAllowed.add("Male");

  const outcomeAllowed = new Set();
  if ($("outcomeSurvived").checked) outcomeAllowed.add("Survived");
  if ($("outcomeDied").checked) outcomeAllowed.add("Died");

  const binaryMustBe1 = {};
  for (const [col, checkboxId] of Object.entries(BINARY_FILTERS)) {
    binaryMustBe1[col] = $(checkboxId).checked; // if true, keep only rows with col==1
  }

  return {
    x: $("xSelect").value,
    y: $("ySelect").value,
    sexAllowed,
    outcomeAllowed,
    binaryMustBe1
  };
}

function filterData(data, sel) {
  return data.filter(r => {
    if (!sel.sexAllowed.has(r.sex_label)) return false;
    if (!sel.outcomeAllowed.has(r.death_label)) return false;

    for (const [col, mustBe1] of Object.entries(sel.binaryMustBe1)) {
      if (mustBe1 && r[col] !== 1) return false;
    }

    if (!Number.isFinite(r[sel.x]) || !Number.isFinite(r[sel.y])) return false;

    return true;
  });
}

function buildTraces(data, sel) {
  const groups = { Survived: [], Died: [] };
  for (const r of data) groups[r.death_label].push(r);

  const makeTrace = (label, rows) => ({
    type: "scatter",
    mode: "markers",
    name: label,
    x: rows.map(r => r[sel.x]),
    y: rows.map(r => r[sel.y]),
    text: rows.map(r => (
      `sex: ${r.sex_label}<br>` +
      `outcome: ${r.death_label}<br>` +
      `age: ${r.age}<br>` +
      `time: ${r.time}`
    )),
    hovertemplate:
      `<b>${label}</b><br>` +
      `${sel.x}: %{x}<br>` +
      `${sel.y}: %{y}<br>` +
      `%{text}<extra></extra>`,
    marker: { size: 9, opacity: 0.8 }
  });

  return [
    makeTrace("Survived", groups.Survived),
    makeTrace("Died", groups.Died)
  ];
}

function drawChart() {
  const sel = currentSelections();
  const filtered = filterData(rawData, sel);

  $("countShown").textContent = String(filtered.length);
  $("countTotal").textContent = String(rawData.length);

  const traces = buildTraces(filtered, sel);

  const layout = {
    margin: { l: 60, r: 20, t: 30, b: 55 },
    xaxis: { title: sel.x.replaceAll("_", " "), zeroline: false },
    yaxis: { title: sel.y.replaceAll("_", " "), zeroline: false },
    legend: { orientation: "h" },
    hovermode: "closest"
  };

  const config = { responsive: true, displaylogo: false };

  Plotly.react("chart", traces, layout, config);
}

// ------------------------------
// Init
// ------------------------------
async function init() {
  const data = await d3.csv(DATA_FILE, parseRow);
  rawData = data;

  populateAxisDropdown($("xSelect"), NUMERIC_COLS, "age");
  populateAxisDropdown($("ySelect"), NUMERIC_COLS, "ejection_fraction");

  [
    "xSelect","ySelect",
    "sexFemale","sexMale",
    "outcomeSurvived","outcomeDied",
    "fAnaemia","fDiabetes","fHBP","fSmoking"
  ].forEach(id => $(id).addEventListener("change", drawChart));

  $("resetBtn").addEventListener("click", () =>
    Plotly.relayout("chart", { "xaxis.autorange": true, "yaxis.autorange": true })
  );

  drawChart();
}

init().catch(err => {
  console.error(err);
  alert("Could not load the dataset. Make sure the CSV file name matches and is in the same folder as index.html.");
});

