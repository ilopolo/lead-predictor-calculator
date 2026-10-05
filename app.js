const translations = {
  en: {
    language: 'Language', currency: 'Currency', campaignStart: 'Campaign Start', campaignEnd: 'Campaign End',
    totalRevenue: 'Total Revenue', averageOrderValue: 'Avg. Order Value', monthAxis: 'Month',
    prospects: 'Prospects', leads: 'Leads', customers: 'Customers',
    leadResponseRate: 'Lead Response Rate', prospectResponseRate: 'Prospect Response Rate',
    forecastAnnouncement: (customers, leads, prospects) => `Forecast updated. Customers: ${customers}, Leads: ${leads}, Prospects: ${prospects}.`,
    chartLabel: 'Monthly campaign chart. Hover a month row to see its values.',
    invalidAmount: 'Enter a number greater than zero.', unsupportedCalculation: 'These values produce a result that is too large to calculate.', invalidDate: 'Choose a valid campaign date range.'
  },
  bg: {
    language: 'Език', currency: 'Валута', campaignStart: 'Начало на кампанията', campaignEnd: 'Край на кампанията',
    totalRevenue: 'Общи приходи', averageOrderValue: 'Средна стойност на поръчка', monthAxis: 'Месец',
    prospects: 'Потенциални клиенти', leads: 'Лийдове', customers: 'Клиенти',
    leadResponseRate: 'Процент на отговор от лийдове', prospectResponseRate: 'Процент на отговор от потенциални клиенти',
    forecastAnnouncement: (customers, leads, prospects) => `Прогнозата е актуализирана. Клиенти: ${customers}, Лийдове: ${leads}, Потенциални клиенти: ${prospects}.`,
    chartLabel: 'Месечна графика на кампанията. Посочете ред, за да видите стойностите.',
    invalidAmount: 'Въведете число, по-голямо от нула.', unsupportedCalculation: 'Тези стойности дават резултат, който е твърде голям за изчисляване.', invalidDate: 'Изберете валиден период на кампанията.'
  }
};

const elements = {
  language: document.querySelector('#language'),
  currency: document.querySelector('#currency'),
  start: document.querySelector('#campaign-start'),
  end: document.querySelector('#campaign-end'),
  revenue: document.querySelector('#revenue'),
  orderValue: document.querySelector('#order-value'),
  leadRate: document.querySelector('#lead-rate'),
  prospectRate: document.querySelector('#prospect-rate'),
  chart: document.querySelector('#chart'),
  announcer: document.querySelector('#result-announcer')
};
const chartAxis = document.querySelector('#chart-axis');
const storageKey = 'leadPredictorCalculatorSettings';
const preferenceControls = {
  language: elements.language,
  currency: elements.currency,
  start: elements.start,
  end: elements.end,
  revenue: elements.revenue,
  orderValue: elements.orderValue,
  leadRate: elements.leadRate,
  prospectRate: elements.prospectRate
};
const defaultSettings = Object.fromEntries(Object.entries(preferenceControls).map(([key, control]) => [key, control.value]));

function readPositiveNumber(input) {
  const value = input.value.trim();
  if (value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? date : null;
}

function isValidPreference(key, value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  const normalized = String(value);
  if (key === 'language' || key === 'currency') {
    return Array.from(preferenceControls[key].options).some(option => option.value === normalized);
  }
  if (key === 'start' || key === 'end') return parseDate(normalized) !== null;
  if (key === 'revenue' || key === 'orderValue') {
    return normalized.trim() !== '' && Number.isFinite(Number(normalized)) && Number(normalized) > 0;
  }
  if (key === 'leadRate' || key === 'prospectRate') {
    const number = Number(normalized);
    const control = preferenceControls[key];
    return Number.isInteger(number) && number >= Number(control.min) && number <= Number(control.max);
  }
  return false;
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;

    Object.entries(preferenceControls).forEach(([key, control]) => {
      const value = saved[key];
      control.value = isValidPreference(key, value) ? String(value) : defaultSettings[key];
    });

    const start = parseDate(elements.start.value);
    const end = parseDate(elements.end.value);
    if (start > end) {
      elements.start.value = defaultSettings.start;
      elements.end.value = defaultSettings.end;
    }
  } catch {
    Object.entries(preferenceControls).forEach(([key, control]) => {
      control.value = defaultSettings[key];
    });
  }
}

function restoreUrlSettings() {
  const params = new URLSearchParams(window.location.search);
  const previousSettings = Object.fromEntries(Object.entries(preferenceControls).map(([key, control]) => [key, control.value]));
  const appliedKeys = [];

  Object.entries(preferenceControls).forEach(([key, control]) => {
    const values = params.getAll(key);
    if (values.length !== 1 || !isValidPreference(key, values[0])) return;
    control.value = values[0];
    appliedKeys.push(key);
  });

  const start = parseDate(elements.start.value);
  const end = parseDate(elements.end.value);
  if (start > end) {
    ['start', 'end'].forEach(key => {
      if (appliedKeys.includes(key)) preferenceControls[key].value = previousSettings[key];
    });
  }
}

function saveSettings() {
  try {
    const settings = Object.fromEntries(Object.entries(preferenceControls).map(([key, control]) => [key, control.value]));
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

function updateUrlSettings() {
  try {
    const url = new URL(window.location.href);
    Object.entries(preferenceControls).forEach(([key, control]) => {
      if (isValidPreference(key, control.value)) {
        url.searchParams.set(key, control.value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState(null, '', url);
  } catch {
    return;
  }
}

function getCampaignMonths(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  if (!start || !end || end < start) return null;
  const months = [];
  for (let year = start.getFullYear(), month = start.getMonth(); year < end.getFullYear() || (year === end.getFullYear() && month < end.getMonth());) {
    months.push(new Date(year, month, 1));
    month += 1;
    if (month === 12) { month = 0; year += 1; }
  }
  if (months.length === 0) months.push(start);
  return months;
}

function distribute(total, count) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function setFieldError(input, errorElement, message) {
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
  errorElement.textContent = message;
}

function getAxisStep(maximum) {
  if (maximum <= 160) return 20;
  return Math.ceil(maximum / 5 / 20) * 20;
}

function renderChart(months, totals, locale, copy) {
  elements.chart.replaceChildren();
  chartAxis.replaceChildren();
  elements.chart.setAttribute('aria-label', copy.chartLabel);
  if (!months) {
    return;
  }
  if (!totals) {
    return;
  }

  const axisMaximum = Math.max(20, totals.prospects * 1.04);
  const axisStep = getAxisStep(axisMaximum);
  elements.chart.style.setProperty('--month-count', months.length);
  elements.chart.style.setProperty('--checkpoint-step', `${(20 / axisMaximum) * 100}%`);
  const axisLabel = document.createElement('span');
  axisLabel.className = 'chart-axis-label';
  chartAxis.append(axisLabel);
  const axisScale = document.createElement('div');
  axisScale.className = 'chart-axis-scale';
  chartAxis.append(axisScale);

  for (let value = 0; value <= axisMaximum; value += axisStep) {
    const tick = document.createElement('span');
    tick.className = 'chart-axis-tick';
    tick.textContent = `${formatNumber(value, locale)} people`;
    tick.style.left = `${(value / axisMaximum) * 100}%`;
    tick.style.transform = value === 0 ? 'none' : value + axisStep > axisMaximum ? 'translateX(-100%)' : 'translateX(-50%)';
    axisScale.append(tick);
  }

  months.forEach((month, index) => {
    const monthNumber = index + 1;
    const row = document.createElement('div');
    row.className = 'month-row';
    const label = document.createElement('span');
    label.className = 'month-label';
    label.textContent = formatNumber(monthNumber, locale);
    row.append(label);

    const bars = document.createElement('div');
    bars.className = 'month-bars';
    bars.setAttribute('aria-hidden', 'true');
    const values = [
      { key: 'prospects', total: totals.prospects, className: 'bar-prospects' },
      { key: 'leads', total: totals.leads, className: 'bar-leads' },
      { key: 'customers', total: totals.customers, className: 'bar-customers' }
    ].map(item => {
      const value = Math.ceil(item.total * monthNumber / months.length);
      const bar = document.createElement('span');
      bar.className = `bar ${item.className}`;
      const barPercent = (value / axisMaximum) * 100;
      bar.style.width = `${barPercent}%`;
      bars.append(bar);
      return { label: `${copy[item.key]}: ${formatNumber(value, locale)}`, barPercent };
    });
    const tooltip = document.createElement('span');
    tooltip.className = 'chart-tooltip';
    tooltip.id = `chart-tooltip-${monthNumber}`;
    tooltip.setAttribute('role', 'tooltip');
    const tooltipLines = [`Month #${formatNumber(monthNumber, locale)}`, ...values.map(item => item.label)];
    tooltipLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) tooltip.append(document.createElement('br'));
      tooltip.append(document.createTextNode(line));
    });
    tooltip.style.left = `min(calc(34px + ${values[0].barPercent}%), calc(100% - 150px))`;
    row.setAttribute('aria-label', tooltipLines.join('. '));
    row.setAttribute('aria-describedby', tooltip.id);
    row.tabIndex = 0;
    row.append(bars, tooltip);
    elements.chart.append(row);
  });
}

function update(shouldAnnounce = false) {
  const language = elements.language.value;
  const locale = language === 'bg' ? 'bg-BG' : 'en-US';
  const copy = translations[language];
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(node => {
    node.textContent = copy[node.dataset.i18n];
  });

  const currencySymbols = { USD: '$', EUR: '€', GBP: '£', BGN: 'лв' };
  const currencySymbol = currencySymbols[elements.currency.value] ?? elements.currency.value;
  document.querySelector('#revenue-prefix').textContent = currencySymbol;
  document.querySelector('#order-prefix').textContent = currencySymbol;

  const revenue = readPositiveNumber(elements.revenue);
  const orderValue = readPositiveNumber(elements.orderValue);
  const leadRate = Number(elements.leadRate.value);
  const prospectRate = Number(elements.prospectRate.value);
  const customerResult = revenue !== null && orderValue !== null ? Math.ceil(revenue / orderValue) : null;
  const customers = Number.isSafeInteger(customerResult) ? customerResult : null;
  const leadResult = customers === null ? null : Math.ceil(customers * 100 / leadRate);
  const leads = Number.isSafeInteger(leadResult) ? leadResult : null;
  const prospectResult = leads === null ? null : Math.ceil(leads * 100 / prospectRate);
  const prospects = Number.isSafeInteger(prospectResult) ? prospectResult : null;
  const unsupportedCalculation = revenue !== null && orderValue !== null && (customers === null || leads === null || prospects === null);
  const invalidCalculationError = unsupportedCalculation ? copy.unsupportedCalculation : '';
  setFieldError(elements.revenue, document.querySelector('#revenue-error'), revenue === null ? copy.invalidAmount : invalidCalculationError);
  setFieldError(elements.orderValue, document.querySelector('#order-error'), orderValue === null ? copy.invalidAmount : invalidCalculationError);
  const validTotals = customers !== null && leads !== null && prospects !== null ? { customers, leads, prospects } : null;

  document.querySelector('#customers-total').textContent = customers === null ? '—' : formatNumber(customers, locale);
  document.querySelector('#leads-total').textContent = leads === null ? '—' : formatNumber(leads, locale);
  document.querySelector('#prospects-total').textContent = prospects === null ? '—' : formatNumber(prospects, locale);
  document.querySelector('#lead-rate-output').textContent = `${Number(leadRate).toFixed(2)}%`;
  document.querySelector('#prospect-rate-output').textContent = `${Number(prospectRate).toFixed(2)}%`;

  const prospectsShare = prospects ? 100 : 0;
  const leadsShare = prospects ? (leads / prospects) * 100 : 0;
  const customersShare = prospects ? (customers / prospects) * 100 : 0;
  document.querySelector('#prospects-share').textContent = `${formatNumber(prospectsShare, locale)}%`;
  document.querySelector('#leads-share').textContent = `${formatNumber(leadsShare, locale)}%`;
  document.querySelector('#customers-share').textContent = `${formatNumber(customersShare, locale)}%`;
  document.querySelector('#prospects-progress').style.width = `${prospectsShare}%`;
  document.querySelector('#leads-progress').style.width = `${leadsShare}%`;
  document.querySelector('#customers-progress').style.width = `${customersShare}%`;

  const months = getCampaignMonths(elements.start.value, elements.end.value);
  const dateError = months ? '' : copy.invalidDate;
  document.querySelector('#date-error').textContent = dateError;
  elements.start.setAttribute('aria-invalid', dateError ? 'true' : 'false');
  elements.end.setAttribute('aria-invalid', dateError ? 'true' : 'false');
  renderChart(months, validTotals, locale, copy);
  saveSettings();

  if (shouldAnnounce) {
    const validationMessages = [];
    if (revenue === null) validationMessages.push(`${copy.totalRevenue}: ${copy.invalidAmount}`);
    if (orderValue === null) validationMessages.push(`${copy.averageOrderValue}: ${copy.invalidAmount}`);
    if (unsupportedCalculation) validationMessages.push(copy.unsupportedCalculation);
    if (dateError) validationMessages.push(copy.invalidDate);
    elements.announcer.textContent = validationMessages.length
      ? validationMessages.join(' ')
      : copy.forecastAnnouncement(formatNumber(customers, locale), formatNumber(leads, locale), formatNumber(prospects, locale));
  }
}

function handleSettingChange() {
  update(true);
  updateUrlSettings();
}

restoreSettings();
restoreUrlSettings();
document.querySelector('#settings-form').addEventListener('change', handleSettingChange);
document.querySelector('#settings-form').addEventListener('input', handleSettingChange);
elements.leadRate.addEventListener('input', handleSettingChange);
elements.prospectRate.addEventListener('input', handleSettingChange);
update();