const DATA_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

const NUMERIC_COLS = [
  "age",
  "creatinine_phosphokinase",
  "ejection_fraction",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "time"
];

const statusEl = document.getElementById("status");
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");

let rawData = [];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}

function setupAxes() {
  NUMERIC_COLS.forEach(c => {
    const ox = new Option(c.replaceAll("_", " "), c);
    const oy = new Option(c.replaceAll("_", " "), c);
    xSelect.add(ox);
    ySelect.add(oy);
  });

  xSelect.value = "serum_sodium";
  ySelect.value = "age";
}

function filteredData() {
  return rawData.filter(d => {
    if (!document.getElementById("sexFemale").checked && d.sex_label === "Female") return false;
    if (!document.getElementById("sexMale").checked && d.sex_label === "Male") return false;
    if (!document.getElementById("outcomeSurvived").checked && d.death_label === "Survived") return false;
    if (!document.getElementById("outcomeDied").checked && d.death_label === "Died") return false;
    if (document.getElementById("anaemia").checked && d.anaemia !== "1") return false;
    if (document.getElementById("diabetes").checked && d.diabetes !== "1") return false;
    if (document.getElementById("highBP").checked && d.high_blood_pressure !== "1") return false;
    if (document.getElementById("smoking").checked && d.smoking !== "1") return false;
    return true;
  });
}

function drawPlot() {
  const data = filteredData();
  const x = xSelect.value;
  const y = ySelect.value;

  const survived = data.filter(d => d.death_label === "Survived");
  const died = data.filter(d => d.death_label === "Died");

  Plotly.newPlot("plot", [
    {
      x: survived.map(d => +d[x]),
      y: survived.map(d => +d[y]),
      mode: "markers",
      name: "Survived"
    },
    {
      x: died.map(d => +d[x]),
      y: died.map(d => +d[y]),
      mode: "markers",
      name: "Died"
    }
  ], {
    xaxis: { title: x.replaceAll("_", " ") },
    yaxis: { title: y.replaceAll("_", " ") }
  });

  // QUI viene scritta la frase
  statusEl.textContent = `Displayed ${data.length} points (filtered).`;
}

document.getElementById("resetZoom").onclick = () =>
  Plotly.relayout("plot", { "xaxis.autorange": true, "yaxis.autorange": true });

async function main() {
  setupAxes();
  const res = await fetch(DATA_FILE);
  rawData = parseCSV(await res.text());

  document.querySelectorAll("input, select")
    .forEach(el => el.addEventListener("change", drawPlot));

  drawPlot();
}

main();
