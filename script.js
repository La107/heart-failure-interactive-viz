// ... (Your CSV loading logic remains the same)

function render() {
  if (!rawData.length) return;
  const xCol = xSelect.value;
  const yCol = ySelect.value;
  const groups = new Map();

  for (const row of rawData) {
    const outcome = row[OUTCOME_COL];
    if (!groups.has(outcome)) groups.set(outcome, []);
    groups.get(outcome).push(row);
  }

  const traces = Array.from(groups.entries()).map(([outcome, rows]) => ({
    type: "scattergl",
    mode: "markers",
    name: outcome,
    x: rows.map(r => r[xCol]),
    y: rows.map(r => r[yCol]),
    marker: { size: 8, opacity: 0.7, color: outcome === "Died" ? "#1f77b4" : "#ff7f0e" }
  }));

  const layout = {
    margin: { l: 50, r: 20, t: 30, b: 50 },
    xaxis: { title: xCol },
    yaxis: { title: yCol },
    
    // THIS IS THE KEY CHANGE
    showlegend: true,
    legend: {
      x: 0.95,           // 95% to the right
      y: 0.95,           // 95% to the top
      xanchor: 'right',  // Align right side of legend box to the 'x' point
      yanchor: 'top',    // Align top side of legend box to the 'y' point
      bgcolor: 'rgba(255, 255, 255, 0.8)',
      bordercolor: '#444',
      borderwidth: 1
    }
  };

  Plotly.newPlot(chartDiv, traces, layout, { responsive: true });
}

// ... (Rest of your zoom/save functions)
