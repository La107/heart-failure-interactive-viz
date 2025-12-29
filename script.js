// ========= Configuration =========
const CSV_FILE = "heart_failure_clinical_records_dataset_cleaned.csv";

// exactly your requested columns (in this order)
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

// ========= State =========
let rawData = [];
let fullRanges = { x: null, y: null };

// ========= DOM =========
const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");
const statusEl = document.getElementById("status");
const chartDiv = document.getElementById("chart");

document.getElementById("zoomInBtn").addEventListener("click", () => zoom(0.8));
document.getElementById("zoomOutBtn").addEventListener("click", () => zoom(1.25));
document.getElementById("resetBtn").addEventListener("click", resetZoom);

document.getElementById("pngBtn").addEventListener("click", () => saveImage("png"));
document.getElementById("jpegBtn").addEventListener("click", () => saveImage("jpeg"));
document.getElementById("pdfBtn").addEventListener("click", savePDF);

// ========= Init =========
populateSelects();
loadCSV();

// ========= Functions =========
function populateSelects() {
  // only numeric columns for axes (your list includes labels)
  const axisCandidates = COLUMNS.filter(c => !["sex_label", "death_label"].includes(c));

  for (const col of axisCandidates) {
    const optX = document.createElement("option");
    optX.value = col;
    optX.textContent = col;
    xSelect.appendChild(optX);

    const optY = document.createElement("option");
    optY.value = col;
    optY.textContent = col;
    ySelect.appendChild(optY);
  }

  // sensible defaults
  xSelect.value = "age";
  ySelect.value = "ejection_fraction";

  xSelect.addEventListener("change", render);
  ySelect.addEventListener("change", render);
}

async function loadCSV() {
  statusEl.textContent = "Loading data…";

  try {
    const res = await fetch(CSV_FILE, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not fetch ${CSV_FILE} (HTTP ${res.status})`);

    const csvText = await res.text();

    const parsed = Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });

    if (parsed.errors?.length) {
      console.warn("PapaParse errors:", parsed.errors);
    }

    rawData = parsed.data;

    statusEl.textContent = `Loaded ${rawData.length} rows.`;
    render();
  } catch (err) {
    console.error(err);
    statusEl.textContent = `Error: ${err.message}`;
  }
}

function getOutcomeTraces(xCol, yCol) {
  const groups = new Map();

  for (const row of rawData) {
    const x = row[xCol];
    const y = row[yCol];
    const outcome = row[OUTCOME_COL];

    // keep only valid numeric points
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
      text: rows.map(r => {
        // hover details (you can add/remove fields freely)
        return [
          `${OUTCOME_COL}: ${r[OUTCOME_COL]}`,
          `sex_label: ${r.sex_label}`,
          `age: ${r.age}`,
          `time: ${r.time}`,
          `${xCol}: ${r[xCol]}`,
          `${yCol}: ${r[yCol]}`
        ].join("<br>");
      }),
      hovertemplate: "%{text}<extra></extra>",
      marker: {
        size: 8,
        opacity: 0.75
      }
    });
  }

  return traces;
}

function computeFullRanges(traces) {
  const xs = traces.flatMap(t => t.x);
  const ys = traces.flatMap(t => t.y);

  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);

  // add small padding
  const xpad = (xmax - xmin) * 0.05 || 1;
  const ypad = (ymax - ymin) * 0.05 || 1;

  fullRanges.x = [xmin - xpad, xmax + xpad];
  fullRanges.y = [ymin - ypad, ymax + ypad];
}

function render() {
  if (!rawData?.length) return;

  const xCol = xSelect.value;
  const yCol = ySelect.value;

  const traces = getOutcomeTraces(xCol, yCol);
  if (!traces.length) {
    statusEl.textContent = "No valid points for these axis selections.";
    return;
  }

  computeFullRanges(traces);

  const layout = {
    title: { text: "Heart Failure – Interactive Scatter Plot", x: 0.02 },
    margin: { l: 60, r: 20, t: 60, b: 55 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    xaxis: {
      title: { text: xCol },
      range: fullRanges.x,
      zeroline: false,
      gridcolor: "rgba(255,255,255,0.08)"
    },
    yaxis: {
      title: { text: yCol },
      range: fullRanges.y,
      zeroline: false,
      gridcolor: "rgba(255,255,255,0.08)"
    },
    legend: {
      x: 0.02,
      y: 0.98,
      bgcolor: "rgba(0,0,0,0.25)",
      bordercolor: "rgba(255,255,255,0.12)",
      borderwidth: 1
    }
  };

  const config = {
    responsive: true,
    displaylogo: false,
    // Keep Plotly toolbar available (extra zoom/pan/lasso + built-in PNG export)
    modeBarButtonsToRemove: ["select2d", "autoScale2d"] // optional
  };

  Plotly.newPlot(chartDiv, traces, layout, config);
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
  // Plotly supports png/jpeg well in-browser
  Plotly.downloadImage(chartDiv, {
    format,
    filename: `heart_failure_scatter_${xSelect.value}_vs_${ySelect.value}`,
    height: 700,
    width: 1000,
    scale: 2
  });
}

async function savePDF() {
  // Make a high-res PNG, then embed into a PDF (browser-only, no server)
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
