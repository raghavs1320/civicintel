/**
 * CivicIntel — Public Leads Explorer
 * Multi-metro filtering, card/table dual-view, gated overflow, checkout handoff.
 */

let allPreviews = {};
let selectedMetro = 'Austin';
let selectedCategory = 'all';
let selectedMinVal = 0;
let currentViewMode = 'cards';

async function initShowcase() {
  try {
    const response = await fetch('data/previews.json');
    if (!response.ok) throw new Error('Failed to load preview data');
    allPreviews = await response.json();
    updateDynamicCounters();
    applyUserPreferences();
  } catch (error) {
    console.error('Error initializing showcase:', error);
    renderFallbackCards();
  }
}

function updateDynamicCounters() {
  if (!allPreviews) return;

  const austinList  = allPreviews['Austin']  || [];
  const dallasList  = allPreviews['Dallas']  || [];
  const orlandoList = allPreviews['Orlando'] || [];

  const austinBtn = document.querySelector('.city-tab-btn[data-metro="Austin"]');
  if (austinBtn) austinBtn.innerHTML = `<span>Austin, TX</span> <span class="opacity-70 font-mono text-xs">${austinList.length}</span>`;

  const dallasBtn = document.querySelector('.city-tab-btn[data-metro="Dallas"]');
  if (dallasBtn) dallasBtn.innerHTML = `<span>Dallas, TX</span> <span class="opacity-70 font-mono text-xs">${dallasList.length}</span>`;

  const orlandoBtn = document.querySelector('.city-tab-btn[data-metro="Orlando"]');
  if (orlandoBtn) orlandoBtn.innerHTML = `<span>Orlando, FL</span> <span class="opacity-70 font-mono text-xs">${orlandoList.length}</span>`;

  const currentList = allPreviews[selectedMetro] || [];
  const foodCount   = currentList.filter(l => l.category === 'Hospitality & Dining').length;
  const retailCount = currentList.filter(l => l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial').length;
  const healthCount = currentList.filter(l => l.category === 'Healthcare & Wellness').length;

  const allCatBtn = document.querySelector('.cat-pill-btn[data-category="all"]');
  if (allCatBtn) allCatBtn.innerHTML = `All <span class="opacity-60 font-mono text-xs ml-1">${currentList.length}</span>`;

  const foodCatBtn = document.querySelector('.cat-pill-btn[data-category="Hospitality & Dining"]');
  if (foodCatBtn) foodCatBtn.innerHTML = `Restaurants &amp; Bars <span class="opacity-60 font-mono text-xs ml-1">${foodCount}</span>`;

  const retailCatBtn = document.querySelector('.cat-pill-btn[data-category="Retail & Commercial Buildout"]');
  if (retailCatBtn) retailCatBtn.innerHTML = `Retail <span class="opacity-60 font-mono text-xs ml-1">${retailCount}</span>`;

  const healthCatBtn = document.querySelector('.cat-pill-btn[data-category="Healthcare & Wellness"]');
  if (healthCatBtn) healthCatBtn.innerHTML = `Healthcare <span class="opacity-60 font-mono text-xs ml-1">${healthCount}</span>`;
}

function setViewMode(mode) {
  currentViewMode = mode;
  const cardsBtn = document.getElementById('view-cards-btn');
  const tableBtn = document.getElementById('view-table-btn');

  const activeClass   = 'text-xs font-semibold px-3 py-1.5 rounded-md transition bg-white text-slate-900 shadow-sm border border-slate-200';
  const inactiveClass = 'text-xs font-semibold px-3 py-1.5 rounded-md transition text-slate-500 hover:text-slate-800';

  if (cardsBtn) cardsBtn.className = mode === 'cards' ? activeClass : inactiveClass;
  if (tableBtn) tableBtn.className = mode === 'table' ? activeClass : inactiveClass;

  renderFilteredCards();
}

function applyUserPreferences() {
  const metroInput = document.getElementById('user-metro-input');
  const catInput   = document.getElementById('user-category-input');

  if (metroInput) selectedMetro    = metroInput.value;
  if (catInput)   selectedCategory = catInput.value;

  document.querySelectorAll('.city-tab-btn').forEach(btn => {
    if (btn.dataset.metro === selectedMetro) {
      btn.className = 'city-tab-btn text-sm font-semibold px-5 py-2 rounded-lg transition bg-slate-900 text-white flex items-center space-x-2';
    } else {
      btn.className = 'city-tab-btn text-sm font-semibold px-5 py-2 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-2';
    }
  });

  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    const isActive = btn.dataset.category === selectedCategory;
    btn.className = isActive
      ? 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-emerald-600 text-white'
      : 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700';
  });

  renderFilteredCards();
}

function setMetro(metro) {
  selectedMetro = metro;
  const metroInput = document.getElementById('user-metro-input');
  if (metroInput) metroInput.value = metro;

  document.querySelectorAll('.city-tab-btn').forEach(btn => {
    if (btn.dataset.metro === metro) {
      btn.className = 'city-tab-btn text-sm font-semibold px-5 py-2 rounded-lg transition bg-slate-900 text-white flex items-center space-x-2';
    } else {
      btn.className = 'city-tab-btn text-sm font-semibold px-5 py-2 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-2';
    }
  });

  updateDynamicCounters();
  renderFilteredCards();
}

function setCategory(category) {
  selectedCategory = category;
  const catInput = document.getElementById('user-category-input');
  if (catInput) catInput.value = category;

  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    const isActive = btn.dataset.category === category;
    btn.className = isActive
      ? 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-emerald-600 text-white'
      : 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700';
  });

  renderFilteredCards();
}

function setMinVal(minVal) {
  selectedMinVal = parseInt(minVal) || 0;
  renderFilteredCards();
}

function renderFilteredCards() {
  const container = document.getElementById('leads-container');
  if (!container || !allPreviews) return;

  let leads = (allPreviews[selectedMetro] || []).filter(lead => {
    if (selectedCategory !== 'all' && lead.category !== selectedCategory) return false;
    if (selectedMinVal > 0 && lead.estimated_valuation < selectedMinVal) return false;
    return true;
  });

  const totalCount  = leads.length;
  const displayLeads = leads.slice(0, 10);

  if (displayLeads.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">
        No commercial buildouts match the current filters.
      </div>
    `;
    return;
  }

  if (currentViewMode === 'table') {
    container.innerHTML = renderTableView(displayLeads, totalCount);
  } else {
    container.innerHTML = renderDossierCards(displayLeads, totalCount);
  }
}

function cleanConceptName(name) {
  if (!name) return 'Commercial Buildout';
  return name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/LLC\.?$/i, '')
    .replace(/Inc\.?$/i, '')
    .replace(/Corp\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCategory(cat) {
  const map = {
    'Hospitality & Dining': 'Hospitality',
    'Retail & Commercial Buildout': 'Retail',
    'Healthcare & Wellness': 'Healthcare',
    'General Commercial': 'Commercial',
    'Office & Professional Services': 'Office',
    'Industrial & Warehouse': 'Industrial',
  };
  return map[cat] || cat || 'Commercial';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch(e) { return dateStr; }
}

function renderDossierCards(leads, totalCount) {
  const stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';

  const cards = leads.map(lead => {
    const valText    = lead.estimated_valuation
      ? '$' + Number(lead.estimated_valuation).toLocaleString()
      : 'Undisclosed';
    const formattedDate = formatDate(lead.filing_date);
    const titleClean    = cleanConceptName(lead.concept_name);
    const catLabel      = formatCategory(lead.category);
    const scope         = lead.project_description || lead.scope_of_work || '';

    return `
      <div class="lead-card bg-white border border-slate-200 rounded-2xl p-5">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-slate-900 text-base leading-snug truncate">${escapeHtml(titleClean)}</div>
            <div class="text-xs text-slate-500 mt-0.5 truncate">${escapeHtml(lead.street_address || '')}, ${stateCode}</div>
          </div>
          <span class="font-mono text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">
            ${escapeHtml(catLabel)}
          </span>
        </div>

        ${scope ? `
        <div class="bg-slate-50 rounded-xl px-3.5 py-2.5 mb-3">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Permit Scope</div>
          <div class="text-xs text-slate-700 leading-relaxed">${escapeHtml(scope)}</div>
        </div>` : ''}

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          <div class="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
            ${valText !== 'Undisclosed' ? `<span class="font-bold text-slate-800">${valText}</span>` : ''}
            <span>#${escapeHtml(lead.permit_number || 'MUNI')}</span>
            ${formattedDate ? `<span class="hidden sm:inline">${formattedDate}</span>` : ''}
          </div>
          <button
            onclick="goToPersonalizedCheckout()"
            class="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap">
            View Territory
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="space-y-3">${cards}</div>` + renderOverflowNotice(totalCount);
}

function renderTableView(leads, totalCount) {
  const stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';

  const tableRows = leads.map(lead => {
    const valText       = lead.estimated_valuation
      ? '$' + Number(lead.estimated_valuation).toLocaleString()
      : '—';
    const formattedDate = formatDate(lead.filing_date);
    const titleClean    = cleanConceptName(lead.concept_name);

    return `
      <tr class="hover:bg-slate-50/60 transition border-b border-slate-100 text-sm">
        <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
          ${escapeHtml(formattedDate)}
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-slate-900 leading-snug">${escapeHtml(titleClean)}</div>
          <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(lead.street_address || '')}, ${stateCode}</div>
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap">
          <span class="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">${formatCategory(lead.category)}</span>
        </td>
        <td class="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
          ${valText}
        </td>
        <td class="py-3.5 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
          #${escapeHtml(lead.permit_number || 'MUNI')}
        </td>
        <td class="py-3.5 px-4 text-right whitespace-nowrap">
          <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer">
            Unlock Feed
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const tableHtml = `
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th class="py-3 px-4">Filed</th>
              <th class="py-3 px-4">Business</th>
              <th class="py-3 px-4">Type</th>
              <th class="py-3 px-4">Budget</th>
              <th class="py-3 px-4">Permit</th>
              <th class="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return tableHtml + renderOverflowNotice(totalCount);
}

function renderOverflowNotice(totalCount) {
  if (totalCount <= 10) return '';
  const stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';
  const hidden = totalCount - 10;
  return `
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mt-4">
      <div class="max-w-lg mx-auto">
        <div class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Preview Limited to 10 Records</div>
        <h3 class="text-xl font-bold text-slate-900 mb-2">
          ${hidden} additional buildouts in ${selectedMetro}, ${stateCode} not shown
        </h3>
        <p class="text-sm text-slate-600 leading-relaxed mb-5">
          Full access includes all ${totalCount} active permit records with jobsite addresses, contractor names, project budgets, and CSV export. New permits are indexed every morning from official city hall dockets.
        </p>
        <button
          onclick="goToPersonalizedCheckout()"
          class="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition cursor-pointer">
          Check Territory Availability
        </button>
        <div class="mt-4 flex items-center justify-center space-x-4 text-[11px] text-slate-400">
          <span>Official municipal records</span>
          <span>·</span>
          <span>One licensee per industry</span>
          <span>·</span>
          <span>7-day trial for $1</span>
        </div>
      </div>
    </div>
  `;
}

function goToPersonalizedCheckout() {
  const metroInput = document.getElementById('user-metro-input');
  const catInput   = document.getElementById('user-category-input');

  const metro    = metroInput ? metroInput.value : selectedMetro;
  const category = catInput   ? catInput.value   : selectedCategory;

  sessionStorage.setItem('custom_pref_metro',    metro);
  sessionStorage.setItem('custom_pref_category', category);

  window.location.href = `checkout.html?metro=${encodeURIComponent(metro)}&category=${encodeURIComponent(category)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFallbackCards() {
  const container = document.getElementById('leads-container');
  if (container) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
        Loading permit records from city dockets...
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', initShowcase);
