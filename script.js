// script.js — FINAL: keep numbers, remove ALL tick marks, remove duplicate 0 at origin

const CSV_FILE = "./heart_failure_clinical_records_dataset_cleaned.csv";

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

const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");
const chartDiv = document.getElementById("chart");
const statusLeft = document.getElementById("statusLeft");

document.getElementById("zoomInBtn").addEventListener("click", () => zoom(0.8));
document.getElementById("zoomOutBtn").addEventListener("click", () => zoom(1.25));
document.getElementById("resetBtn").addEventListener("click", resetZoom);

document.getElementById("pngBtn").addEventListener("click", () => saveImage("png"));
document.getElementById("jpegBtn").addEventListener("click", () => saveImage("jpeg"));
document.getElementById("pdfBtn").addEventListener("click", savePDF);

init();

/* ---------------- INIT ---------------- */

function init() {
  const axisCandidates = COLUMNS.filter(
    c => !["sex_label", "death_label"].includes(c)
  );

  axisCandidates.forEach(col => {
    xSelect.add(new Option(col, col));
    ySelect.add(new Option(col, col));
  });

  xSelect.value = "age";
  ySelect.value = "ejection_fraction";

  xSelect.addEventListener("change", render);
  ySelect.addEventListener("change", render);

  loadCSV();
}

/* ---------------- LOAD DATA ---------------- */

async function loadCSV() {
  statusLeft.textContent = "Loading data…";

  try {
    const res = await fetch(`${CSV_FILE}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV not found (HTTP ${res.status})`);

    const csvText = await res.text();
    const parsed = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    rawData = parsed.data || [];
    statusLeft.textContent = `Loaded ${rawData.length} rows.`;

    render();
  } catch (err) {
    console.error(err);
    statusLeft.textContent = `Error: ${err.message}`;
  }
}

/* ---------------- HELPERS ---------------- */

function niceStep(span) {
  if (!isFinite(span) || span <= 0) return 1;
  const target = span / 6; // ~6 ticks
  const pow = Math.pow(10, Math.floor(Math.log10(target)));
  const n = target / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

/* ---------------- RENDER ---------------- */

function render() {
  if (!rawData.length) return;

  const xCol = xSelect.value;
  const yCol = ySelect.value;

  // group rows by outcome label
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

  const colorMap = { Died: "#1f77b4", Survived: "#ff7f0e" };

  const traces = [];
  for (const [outcome, rows] of groups.entries()) {
    traces.push({
      type: "scattergl",
      mode: "markers",
      name: outcome,
      showlegend: true,
      x: rows.map(r => r[xCol]),
      y: rows.map(r => r[yCol]),
      text: rows.map(r =>
        `${OUTCOME_COL}: ${r[OUTCOME_COL]}<br>` +
        `sex: ${r.sex_label}<br>` +
        `${xCol}: ${r[xCol]}<br>` +
        `${yCol}: ${r[yCol]}`
      ),
      hovertemplate: "%{text}<extra></extra>",
      marker: { size: 8, opacity: 0.75, color: colorMap[outcome] || "#444" }
    });
  }

  if (!traces.length) {
    statusLeft.textContent = "No valid points for these axis selections.";
    return;
  }

  // ranges
  const xs = traces.flatMap(t => t.x);
  const ys = traces.flatMap(t => t.y);

  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymax = Math.max(...ys);

  const xpad = (xmax - xmin) * 0.05 || 1;
  const ypad = ymax * 0.05 || 1;

  fullRanges.x = [xmin - xpad, xmax + xpad];
  fullRanges.y = [0, ymax + ypad]; // Y starts at 0

  const xStep = niceStep(fullRanges.x[1] - fullRanges.x[0]);
  const yStep = niceStep(fullRanges.y[1] - fullRanges.y[0]);

  // ✅ keep numbers, remove ALL tick marks (no dashes)
  const axisCommon = {
    showgrid: false,
    zeroline: false,

    showline: true,
    linewidth: 1.8,
    linecolor: "#111",

    ticks: "",       // no tick marks
    ticklen: 0,
    tickwidth: 0,

    showticklabels: true,
    tickfont: { size: 12, color: "#111" },

    automargin: true,
    title_standoff: 30
  };

  const layout = {
    margin: { l: 110, r: 150, t: 25, b: 110 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",

    // ✅ X axis numbers, but avoid showing "0" at the origin
    xaxis: {
      ...axisCommon,
      title: { text: xCol },
      range: fullRanges.x,
      tickmode: "linear",
      dtick: xStep,
      tick0: xStep // shifts ticks so 0 is not printed on X
    },

    // ✅ Y axis numbers, start from 0 (single 0 here)
    yaxis: {
      ...axisCommon,
      title: { text: yCol },
      range: fullRanges.y,
      tickmode: "linear",
      dtick: yStep,
      tick0: 0
    },

    legend: {
      x: 1.02,
      y: 1,
      xanchor: "left",
      yanchor: "top",
      bgcolor: "rgba(255,255,255,0.95)",
      borderwidth: 0,
      font: { size: 14 }
    }
  };

  Plotly.newPlot(chartDiv, traces, layout, {
    responsive: true,
    displaylogo: false
  });
}

/* ---------------- ZOOM ---------------- */

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
  Plotly.relayout(chartDiv, {
    "xaxis.range": fullRanges.x,
    "yaxis.range": fullRanges.y
  });
}

/* ---------------- EXPORT ---------------- */

function saveImage(format) {
  Plotly.downloadImage(chartDiv, {
    format,
    filename: `heart_failure_${xSelect.value}_vs_${ySelect.value}`,
    height: 700,
    width: 1000,
    scale: 2
  });
}

async function savePDF() {
  const { jsPDF } = window.jspdf;

  const img = await Plotly.toImage(chartDiv, {
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

  pdf.addImage(img, "PNG", 0, 0, 1000, 700);
  pdf.save(`heart_failure_${xSelect.value}_vs_${ySelect.value}.pdf`);
}
