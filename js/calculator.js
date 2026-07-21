// Water demand (ET0/crop coefficients) is still a planning-stage estimate for a
// generic semi-arid climate, pending real weather station data. Crop yields are
// Charlie's real local agricultural figures for what's actually grown here.

const ET0_MM_PER_DAY = { dry: 5.5, wet: 3.5 }; // reference evapotranspiration
const CROP_KC = {
  chinese_cabbage: 1.0,
  collard_greens: 1.0,
  swiss_chard: 0.95,
  amaranth: 0.9,
  okra: 1.05
}; // crop coefficient, mid-season — generic estimate, not crop-specific field data
const METHOD_EFFICIENCY = { hand: 0.55, drip: 0.90 }; // fraction of applied water actually used by the crop
const MULCH_FACTOR = { yes: 0.80, no: 1.0 }; // additional reduction in gross demand from mulch/compost
const WELL_MAX_LPH = 5000; // given: max sustainable well output, liters/hour
const SOLAR_PUMP_HOURS = { dry: 6, wet: 4 }; // effective daily pumping hours, varies with cloud cover — estimate

const CROP_LABELS = {
  chinese_cabbage: 'Chinese Cabbage',
  collard_greens: 'Collard Greens',
  swiss_chard: 'Swiss Chard',
  amaranth: 'Amaranth',
  okra: 'Okra'
};
// Real local yield data from Charlie, kg/m^2/month (midpoint of his given range)
const YIELD_KG_PER_M2_PER_MONTH = {
  chinese_cabbage: 1.9,
  collard_greens: 1.65,
  swiss_chard: 1.4,
  amaranth: 1.1,
  okra: 1.0
};

function dailyDemandLiters({ season, crop, method, mulch, area }) {
  const mmPerDay = ET0_MM_PER_DAY[season] * CROP_KC[crop];
  const grossMm = (mmPerDay / METHOD_EFFICIENCY[method]) * MULCH_FACTOR[mulch];
  return grossMm * area; // 1mm over 1 m^2 = 1 liter
}

function wellDailyCapacity(season) {
  return WELL_MAX_LPH * SOLAR_PUMP_HOURS[season];
}

function readParams() {
  return {
    season: document.getElementById('calc-season').value,
    crop: document.getElementById('calc-crop').value,
    method: document.getElementById('calc-method').value,
    mulch: document.getElementById('calc-mulch').value,
    area: Math.max(1, Number(document.getElementById('calc-area').value) || 0)
  };
}

function fmt(n) {
  return Math.round(n).toLocaleString();
}

function renderResults(p) {
  const demand = dailyDemandLiters(p);
  const capacity = wellDailyCapacity(p.season);
  const pctOfCapacity = (demand / capacity) * 100;

  const baseline = dailyDemandLiters({ ...p, method: 'hand', mulch: 'no' });
  const savingsPct = 100 - (demand / baseline) * 100;

  const yieldKg = YIELD_KG_PER_M2_PER_MONTH[p.crop] * p.area;

  const overCapacity = demand > capacity;

  document.getElementById('calc-results').innerHTML = `
    <div class="stat"><span>Daily water demand</span><b>${fmt(demand)} L/day</b></div>
    <div class="stat"><span>Well capacity, this season</span><b>${fmt(capacity)} L/day</b></div>
    <div class="stat"><span>Share of well capacity used</span>
      <b class="${overCapacity ? 'warn' : 'ok'}">${pctOfCapacity.toFixed(0)}%${overCapacity ? ' — exceeds sustainable output' : ''}</b>
    </div>
    <div class="stat"><span>Water saved vs. hand watering, no mulch</span><b>${savingsPct.toFixed(0)}%</b></div>
    <div class="stat"><span>Estimated yield (per month)</span><b>${fmt(yieldKg)} kg</b></div>
  `;
}

let chartDemand, chartSavings, chartYield;

function renderCharts(p) {
  const seasons = ['dry', 'wet'];
  const demandData = seasons.map(s => dailyDemandLiters({ ...p, season: s, method: 'hand', mulch: 'no' }));
  const demandDripData = seasons.map(s => dailyDemandLiters({ ...p, season: s, method: 'drip', mulch: 'yes' }));
  const capacityData = seasons.map(s => wellDailyCapacity(s));

  const demandCfg = {
    type: 'bar',
    data: {
      labels: ['Dry season', 'Wet season'],
      datasets: [
        { label: 'Hand watering, no mulch', data: demandData, backgroundColor: '#b0392b' },
        { label: 'Drip + mulch', data: demandDripData, backgroundColor: '#4c7a5e' },
        { label: 'Well max capacity', data: capacityData, backgroundColor: '#3d7ea6' }
      ]
    },
    options: { responsive: true, scales: { y: { title: { display: true, text: 'Liters / day' } } } }
  };

  const crops = Object.keys(CROP_LABELS);
  const cropLabels = crops.map(c => CROP_LABELS[c]);
  const savingsHand = crops.map(c => dailyDemandLiters({ ...p, crop: c, method: 'hand', mulch: 'no' }));
  const savingsDrip = crops.map(c => dailyDemandLiters({ ...p, crop: c, method: 'drip', mulch: 'yes' }));

  const savingsCfg = {
    type: 'bar',
    data: {
      labels: cropLabels,
      datasets: [
        { label: 'Hand watering, no mulch', data: savingsHand, backgroundColor: '#b0392b' },
        { label: 'Drip + mulch', data: savingsDrip, backgroundColor: '#4c7a5e' }
      ]
    },
    options: { responsive: true, scales: { y: { title: { display: true, text: 'Liters / day, current area & season' } } } }
  };

  const yieldData = crops.map(c => YIELD_KG_PER_M2_PER_MONTH[c] * p.area);
  const yieldCfg = {
    type: 'bar',
    data: {
      labels: cropLabels,
      datasets: [{ label: 'kg per month', data: yieldData, backgroundColor: '#a9754f' }]
    },
    options: { responsive: true, scales: { y: { title: { display: true, text: 'kg / month' } } } }
  };

  if (chartDemand) { chartDemand.data = demandCfg.data; chartDemand.update(); }
  else chartDemand = new Chart(document.getElementById('chart-demand'), demandCfg);

  if (chartSavings) { chartSavings.data = savingsCfg.data; chartSavings.update(); }
  else chartSavings = new Chart(document.getElementById('chart-savings'), savingsCfg);

  if (chartYield) { chartYield.data = yieldCfg.data; chartYield.update(); }
  else chartYield = new Chart(document.getElementById('chart-yield'), yieldCfg);
}

function render() {
  const p = readParams();
  renderResults(p);
  renderCharts(p);
}

['calc-season', 'calc-crop', 'calc-method', 'calc-mulch', 'calc-area'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
});

render();
