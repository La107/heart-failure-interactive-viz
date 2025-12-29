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

const xSelect = document.getElementById("xSelect");
const ySelect = document.getElementById("ySelect");
const chartDiv = document.getElementById("chart");
const statusEl = document.getElementById("status");

document.getElementById("zoomInBtn").onclick = () => zoom(0.8);
document.getElementById("zoomOutBtn").onclick = () => zoom(1.25);
document.getElementById("resetBtn").onclick = resetZoom;

document.getElementById("pngBtn").onclick = () => saveImage("png");
document.getElementById("jpegBtn").onclick = () => saveImage("jpeg");
document.getElementById("pdfBtn").onclick = savePDF;

init();

function init() {
  const numericCols = COLUMNS.filter(c => !["sex_label", "death_label"].includes(c));

  numericCols.forEach(col => {
    xSelect.add(new Option(col, col));
    ySelect.add(new Option(col, col));
  });

  xSelect.value = "age";
  ySelect.value = "ejection_fraction";

  xSelect.onchange = render;
  ySelect.onchange = render;

  loadCSV();
}

async function loadCSV() {
  const res = await fetch(CSV_FILE);
  const text = await res.text();

  const parsed = Papa.parse(text, {
    header: true,
    dynamicTyping: true
  });

  rawData = parsed.data;
  statusEl.textContent = `Loaded ${rawData.length} rows`;
  render();
}

function render() {
  const xCol = xSelect.value;
  const yCol = ySelect.value;

  const groups = {};

  rawData.forEach(d => {
    if (typeof d[xCol] !== "number" || typeof d[yCol] !== "number") return;
    const key = d[OUTCOME_COL];
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });

  const traces = Object.entries(groups).map(([key, rows]) => ({
    type: "scattergl",
    mode: "markers",
    name: key,
    x: rows.map(r => r[xCol]),
    y: rows.map(r => r[yCol]),
    text: rows.map(r =>
      `${OUTCOME_COL}: ${r[OUTCOME_COL]}<br>` +
      `age: ${r.age}<br>` +
      `sex: ${r.sex_label}`
    ),
    hovertemplate: "%{text}<extra></extra>",
    marker: { size: 8, opacity: 0.75 }
  }));

  const xs = traces.flatMap(t => t.x);
  const ys = traces.flatMap(t => t.y);
  fullRanges.x = [Math.min(...xs), Math.max(...xs)];
  fullRanges.y = [Math.min(...ys), Math.max(...ys)];

  const layout = {
    margin: { l: 60, r: 20, t: 40, b: 55 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",

    xaxis: {
      title: xCol,
      showgrid: false,      // ❌ gridlines removed
      zeroline: false,
      showline: true,       // ✅ axis line ON
      linewidth: 1.5,
      linecolor: "#ffffff",
      mirror: false
    },

    yaxis: {
      title: yCol,
      showgrid: false,      // ❌ gridlines removed
      zeroline: false,
      showline: true,       // ✅ axis line ON
      linewidth: 1.5,
      linecolor: "#ffffff",
      mirror: false
    },

    legend: {
      bgcolor: "rgba(0,0,0,0.3)",
      borderwidth: 0
    }
  };

  Plotly.newPlot(chartDiv, traces, layout, {
    responsive: true,
    displaylogo: false
  });
}

function zoom(f) {
  const xr = chartDiv.layout.xaxis.range;
  const yr = chartDiv.layout.yaxis.range;
  const xm = (xr[0] + xr[1]) / 2;
  const ym = (yr[0] + yr[1]) / 2;

  Plotly.relayout(chartDiv, {
    "xaxis.range": [xm - (xr[1] - xr[0]) * f / 2, xm + (xr[1] - xr[0]) * f / 2],
    "yaxis.range": [ym - (yr[1] - yr[0]) * f / 2, ym + (yr[1] - yr[0]) * f / 2]
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
    filename: "heart_failure_scatter",
    width: 1000,
    height: 700,
    scale: 2
  });
}

async function savePDF() {
  const img = await Plotly.toImage(chartDiv, { format: "png", width: 1000, height: 700, scale: 2 });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("landscape", "pt", [1000, 700]);
  pdf.addImage(img, "PNG", 0, 0, 1000, 700);
  pdf.save("heart_failure_scatter.pdf");
}
