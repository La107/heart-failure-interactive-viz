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

// Event Listeners
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

  // Group data by Outcome
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
        `Outcome: ${r[OUTCOME_COL]}<br>` +
        `Sex: ${r.sex_label}<br>` +
        `Age: ${r.age}<br>` +
        `${xCol}: ${r[xCol]}<br>` +
        `${yCol}: ${r[yCol]}`
      ),
      hovertemplate: "%{text}<extra></extra>",
      marker: {
        size: 9,
        opacity: 0.7,
        color: colorMap[outcome] || "#444",
        line: { width: 1, color: '#fff' }
      }
    });
  }

  // Calculate Ranges
  const allX = traces.flatMap(t => t.x);
  const allY = traces.flatMap(t => t.y);
  const xmin = Math.min(...allX);
  const xmax = Math.max(...allX);
  const ymin = Math.min(...allY);
  const ymax = Math.max(...allY);
  
  const xpad = (xmax - xmin) * 0.05 || 1;
  const ypad = (ymax - ymin) * 0.05 || 1;

  fullRanges.x = [xmin - xpad, xmax + xpad];
  fullRanges.y = [ymin - ypad, ymax + ypad];

  const layout = {
    margin: { l: 60, r: 30, t: 30, b: 60 },
    paper_bgcolor: "white",
    plot_bgcolor: "#f9f9f9",
    hovermode: "closest",

    xaxis: {
      title: { text: xCol, font: { size: 14, weight: 'bold' } },
      range: fullRanges.x,
      gridcolor: "#eee",
      zeroline: false
    },

    yaxis: {
      title: { text: yCol, font: { size: 14, weight: 'bold' } },
      range: fullRanges.y,
      gridcolor: "#eee",
      zeroline: false
    },

    // ✅ LEGEND POSITIONED ON THE GRAPH (TOP-RIGHT)
    showlegend: true,
    legend: {
      x: 0.97,           // Near the right edge (inside)
      y: 0.97,           // Near the top edge (inside)
      xanchor: "right",  // Anchor the right side of the box
      yanchor: "top",    // Anchor the top side of the box
      bgcolor: "rgba(255, 255, 255, 0.8)",
      bordercolor: "#ccc",
      borderwidth: 1,
      font: { size: 12 }
    }
  };

  Plotly.newPlot(chartDiv, traces, layout, {
    responsive: true,
    displaylogo: false
  });
}

function zoom(factor) {
  const gd = chartDiv;
  const xr = gd.layout.xaxis.range;
  const yr = gd.layout.yaxis.range;

  const xMid = (xr[0] + xr[1]) / 2;
  const yMid = (yr[0] + yr[1]) / 2;
  const xHalf = (xr[1] - xr[0]) / 2 * factor;
  const yHalf = (yr[1] - yr[0]) / 2 * factor;

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
    filename: `heart_failure_chart`,
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
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: [1000, 700] });
  pdf.addImage(dataUrl, "PNG", 0, 0, 1000, 700);
  pdf.save(`heart_failure_chart.pdf`);
}
