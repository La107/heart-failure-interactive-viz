const CSV_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

const COLUMNS = [
  "age",
  "anaemia",
  "creatinine_phosphokinase",
  "diabetes",
  "ejection_fraction",
  "high_blood_pressure",
  "platelets",
  "serum_creatinine",
  "serum_sodium",
  "smoking",
  "time",
  "sex_label",
  "death_label"
];

const OUTCOME_COL = "death_label";

let rawData = [];
let fullRanges = { x: null, y: null };

const xSelect  = document.getElementById("xSelect");
const ySelect  = document.getElementById("ySelect");
const chartDiv = document.getElementById("chart");
const statusEl = document.getElementById("status");
const fileInput = document.getElementById("fileInput");

document.getElementById("zoomInBtn").addEventListener("click", () => zoom(0.8));
document.getElementById("zoomOutBtn").addEventListener("click", () => zoom(1.25));
document.getElementById("resetBtn").addEventListener("click", resetZoom);

document.getElementById("pngBtn").addEventListener("click", () => saveImage("png"));
document.getElementById("jpegBtn").addEventListener("click", () => saveImage("jpeg"));
document.getElementById("pdfBtn").addEventListener("click", savePDF);

fileInput.addEventListener("change", handleLocalUpload);

init();

function init() {
  const axisCandidates = COLUMNS.filter(c => !["sex_label", "death_label"].includes(c));

  axisCandidates.forEach(col => {
    xSelect.add(new Option(col, col));
    ySelect.add(new Option(col, col));
  });

  xSelect.value = "age";
  ySelect.value = "ejection_fraction";

  xSelect.addEventListener("change", render);
  ySelect.addEventListener("change", render);

  loadCSVViaFetch();
}

async function loadCSVViaFetch() {
  statusEl.textContent = "Loading data…";

  try {
    const res = await fetch(CSV_FILE, { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`Fetch failed (HTTP ${res.status}). Check CSV path/name.`);
    }

    const csvText = await res.text();
    parseAndSetData(csvText);

  } catch (err) {
    // IMPORTANT: This is what you’re hitting now
    statusEl.textContent =
      `Could not load CSV via fetch. ` +
      `If you opened this as file://, it won’t work. ` +
      `Use GitHub Pages or upload the CSV using the file picker.`;

    console.error("CSV load error:", err);
  }
}

function handleLocalUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  statusEl.textContent = `Reading ${file.name}…`;

  const reader = new FileReader();
  reader.onload = () => {
    parseAndSetData(reader.result);
  };
  reader.onerror = () => {
    statusEl.textContent = "Error reading the file.";
  };
  reader.readAsText(file);
}

function parseAndSetData(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  rawData = parsed.data || [];

  if (!rawData.length) {
    statusEl.textContent = "CSV parsed but no rows found.";
    return;
  }

  statusEl.textContent = `Loaded ${rawData.length} rows.`;
  render();
}

function render() {
  if (!rawData.length) return;

  const xCol = xSelect.value;
  const yCol = ySelect.value;

  const groups = new Map();

  for (const row of rawData) {
    const x = row[xCol];
    const y = row[yCol];
    const outcome = row[OUTCOME_COL];

    if (typeof x !== "number" || Number.isNaN(x)) continue;
    if (typeof y !== "number" || Number.isNaN(y)) continue;
    if (!outcome) continue;

    if (!groups.has(outcome)) groups.set(outcome, []);
    groups.get(outcome).push(row);
  }

  const traces = [];
  for (const [outcome, rows] of groups.entries()) {
    traces.push({
      type: "scattergl",
      mode: "markers",
      name: outcome,
      x: rows.map(r => r[xCol]),
      y: rows.map(r => r[yCol]),
      text: rows.map(r =>
        `${OUTCOME_COL}: ${r[OUTCOME_COL]}<br>` +
        `sex_label: ${r.sex_label}<br>` +
        `age: ${r.age}<br>` +
        `time: ${r.time}<br>` +
        `${xCol}: ${r[xCol]}<br>` +
        `${yCol}: ${r[yCol]}`
      ),
      hovertemplate: "%{text}<extra></extra>",
      marker: { size: 8, opacity: 0.75 }
    });
  }

  if (!traces.length) {
    statusEl.textContent = "No valid points for these axis selections.";
    return;
  }

  // ranges (for reset)
  const xs = traces.flatMap(t => t.x);
  const ys = traces.flatMap(t => t.y);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);

  const xpad = (xmax - xmin) * 0.05 || 1;
  const ypad = (ymax - ymin) * 0.05 || 1;

  fullRanges.x = [xmin - xpad, xmax + xpad];
  fullRanges.y = [ymin - ypad, ymax + ypad];

  const layout = {
    margin: { l: 60, r: 20, t: 30, b: 55 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",

    // ✅ no gridlines + ✅ axis lines like your screenshot
    xaxis: {
      title: { text: xCol },
      showgrid: false,
      zeroline: false,
      showline: true,
      linewidth: 1.5,
      linecolor: "#111",
      ticks: "outside",
      ticklen: 6,
      tickwidth: 1.2,
      tickcolor: "#111",
      range: fullRanges.x
    },
    yaxis: {
      title: { text: yCol },
      showgrid: false,
      zeroline: false,
      showline: true,
      linewidth: 1.5,
      linecolor: "#111",
      ticks: "outside",
      ticklen: 6,
      tickwidth: 1.2,
      tickcolor: "#111",
      range: fullRanges.y
    },

    legend: { x: 0.02, y: 0.98 }
  };

  Plotly.newPlot(chartDiv, traces, layout, {
    responsive: true,
    displaylogo: false
  });
}

function zoom(factor) {
  const gd = chartDiv;
  const xr = gd.layout?.xaxis?.range;
  const yr = gd.layout?.yaxis?.range;

  const xRange = (xr && xr.length === 2) ? xr : fullRanges.x;
  const yRange = (yr && yr.length === 2) ? yr : fullRanges.y;
  if (!xRange || !yRange) return;

  const xMid = (xRange[0] + xRange[1]) / 2;
  const yMid = (yRange[0] + yRange[1]) / 2;

  const xHalf = (xRange[1] - xRange[0]) / 2 * factor;
  const yHalf = (yRange[1] - yRange[0]) / 2 * factor;

  Plotly.relayout(gd, {
    "xaxis.range": [xMid - xHalf, xMid + xHalf],
    "yaxis.range": [yMid - yHalf, yMid + yHalf]
  });
}

function resetZoom() {
  if (!fullRanges.x || !fullRanges.y) return;
  Plotly.relayout(chartDiv, {
    "xaxis.range": fullRanges.x,
    "yaxis.range": fullRanges.y
  });
}

function saveImage(format) {
  Plotly.downloadImage(chartDiv, {
    format,
    filename: `heart_failure_scatter_${xSelect.value}_vs_${ySelect.value}`,
    height: 700,
    width: 1000,
    scale: 2
  });
}

async function savePDF() {
  const { jsPDF } = window.jspdf;

  const dataUrl = await Plotly.toImage(chartDiv, {
    format: "png",
    height: 700,
    width: 1000,
    scale: 2
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [1000, 700]
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, 1000, 700);
  pdf.save(`heart_failure_scatter_${xSelect.value}_vs_${ySelect.value}.pdf`);
}
