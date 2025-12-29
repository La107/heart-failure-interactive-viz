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

const xSelect  = document.getElementById("xSelect");
const ySelect  = document.getElementById("ySelect");
const chartDiv = document.getElementById("chart");
const statusLeft = document.getElementById("statusLeft");

// UI Button Listeners
document.getElementById("zoomInBtn").addEventListener("click", () => zoom(0.8));
document.getElementById("zoomOutBtn").addEventListener("click", () => zoom(1.25));
document.getElementById("resetBtn").addEventListener("click", resetZoom);

document.getElementById("pngBtn").addEventListener("click", () => saveImage("png"));
document.getElementById("jpegBtn").addEventListener("click", () => saveImage("jpeg"));
document.getElementById("pdfBtn").addEventListener("click", savePDF);

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

  loadCSV();
}

async function loadCSV() {
  statusLeft.textContent = "Loading data…";
  try {
    const res = await fetch(`${CSV_FILE}?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV not found (HTTP ${res.status}).`);

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

  const colorMap = {
    "Died": "#1f77b4",
    "Survived": "#ff7f0e"
  };

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
        `sex_label: ${r.sex_label}<br>` +
        `age: ${r.age}<br>` +
        `time: ${r.time}<br>` +
        `${xCol}: ${r[xCol]}<br>` +
        `${yCol}: ${r[yCol]}`
      ),
      hovertemplate: "%{text}<extra></extra>",
      marker: {
        size: 8,
        opacity: 0.75,
        color: colorMap[outcome] || "#444"
      }
    });
  }

  const xs = traces.flatMap(t => t.x);
  const ys = traces.flatMap(t => t.y);

  const xmin = Math.min(...xs, 0);
  const xmax = Math.max(...xs, 0);
  const ymin = Math.min(...ys, 0);
  const ymax = Math.max(...ys, 0);

  const xpad = (xmax - xmin) * 0.05 || 1;
  const ypad = (ymax - ymin) * 0.05 || 1;

  fullRanges.x = [xmin - xpad, xmax + xpad];
  fullRanges.y = [ymin - ypad, ymax + ypad];

  const axisCommon = {
    showgrid: false,
    zeroline: false,
    showline: true,
    linewidth: 1.8,
    linecolor: "#111",
    ticks: "",
    showticklabels: true,
    title_standoff: 24
  };

  const layout = {
    // Standard margins since legend is now inside the graph
    margin: { l: 60, r: 40, t: 40, b: 60 }, 
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",

    xaxis: {
      ...axisCommon,
      title: { text: xCol },
      range: fullRanges.x
    },

    yaxis: {
      ...axisCommon,
      title: { text: yCol },
      range: fullRanges.y
    },

    // ✅ LEGEND: Specifically placed on the top-right INSIDE the graph
    legend: {
      x: 0.98,            // 98% of the way to the right
      y: 0.98,            // 98% of the way to the top
      xanchor: "right",   // Anchor right side of box to x coordinate
      yanchor: "top",     // Anchor top side of box to y coordinate
      bgcolor: "rgba(255,255,255,0.7)", // Semi-transparent white
      borderwidth: 1,
      bordercolor: "#ccc",
      font: { size: 13 }
    },

    annotations: [
      {
        x: 0,
        y: 0,
        xref: "x",
        yref: "y",
        text: "0",
        showarrow: false,
        xanchor: "left",
        yanchor: "bottom",
        font: { size: 12, color: "#111" },
        xshift: 6,
        yshift: 6
      }
    ]
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
