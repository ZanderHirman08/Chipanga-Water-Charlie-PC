// All figures below are planning-stage estimates for a semi-arid climate,
// not measurements taken on site. Treat as a starting point to refine with
// local agronomic/climate data, not a survey fact.

const ET0_MM_PER_DAY = { dry: 5.5, wet: 3.5 }; // reference evapotranspiration
const CROP_KC = { leafy: 1.0, tomatoes: 1.15, okra: 1.05 }; // crop coefficient, mid-season
const METHOD_EFFICIENCY = { hand: 0.55, drip: 0.90 }; // fraction of applied water actually used by the crop
const MULCH_FACTOR = { yes: 0.80, no: 1.0 }; // additional reduction in gross demand from mulch/compost
const WELL_MAX_LPH = 5000; // given: max sustainable well output, liters/hour
const SOLAR_PUMP_HOURS = { dry: 6, wet: 4 }; // effective daily pumping hours, varies with cloud cover
const SEASON_LENGTH_DAYS = 90;
const YIELD_KG_PER_M2_PER_SEASON = { leafy: 6, tomatoes: 4, okra: 2 }; // low-input smallholder estimate

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

  const yieldKg = YIELD_KG_PER_M2_PER_SEASON[p.crop] * p.area;

  const overCapacity = demand > capacity;

  document.getElementById('calc-results').innerHTML = `
    <div class="stat"><span>Daily water demand</span><b>${fmt(demand)} L/day</b></div>
    <div class="stat"><span>Well capacity, this season</span><b>${fmt(capacity)} L/day</b></div>
    <div class="stat"><span>Share of well capacity used</span>
      <b class="${overCapacity ? 'warn' : 'ok'}">${pctOfCapacity.toFixed(0)}%${overCapacity ? ' — exceeds sustainable output' : ''}</b>
    </div>
    <div class="stat"><span>Water saved vs. hand watering, no mulch</span><b>${savingsPct.toFixed(0)}%</b></div>
    <div class="stat"><span>Estimated yield (${SEASON_LENGTH_DAYS}-day season)</span><b>${fmt(yieldKg)} kg</b></div>
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

  const crops = ['leafy', 'tomatoes', 'okra'];
  const savingsHand = crops.map(c => dailyDemandLiters({ ...p, crop: c, method: 'hand', mulch: 'no' }));
  const savingsDrip = crops.map(c => dailyDemandLiters({ ...p, crop: c, method: 'drip', mulch: 'yes' }));

  const savingsCfg = {
    type: 'bar',
    data: {
      labels: ['Leafy greens', 'Tomatoes', 'Okra'],
      datasets: [
        { label: 'Hand watering, no mulch', data: savingsHand, backgroundColor: '#b0392b' },
        { label: 'Drip + mulch', data: savingsDrip, backgroundColor: '#4c7a5e' }
      ]
    },
    options: { responsive: true, scales: { y: { title: { display: true, text: 'Liters / day, current area & season' } } } }
  };

  const yieldData = crops.map(c => YIELD_KG_PER_M2_PER_SEASON[c] * p.area);
  const yieldCfg = {
    type: 'bar',
    data: {
      labels: ['Leafy greens', 'Tomatoes', 'Okra'],
      datasets: [{ label: `kg per ${SEASON_LENGTH_DAYS}-day season`, data: yieldData, backgroundColor: '#a9754f' }]
    },
    options: { responsive: true, scales: { y: { title: { display: true, text: 'kg' } } } }
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
