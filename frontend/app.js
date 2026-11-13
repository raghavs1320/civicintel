/**
 * CivicIntel — Public Leads Explorer
 * Multi-metro filtering, dynamic live counters, newest-first sorting,
 * card/table dual-view, gated overflow, and checkout handoff.
 */

var allPreviews = {};
var selectedMetro = 'Austin';
var selectedCategory = 'all';
var selectedMinVal = 0;
var currentViewMode = 'cards';

async function initShowcase() {
  try {
    var response = await fetch('data/previews.json');
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

  var austinList  = allPreviews['Austin']  || [];
  var dallasList  = allPreviews['Dallas']  || [];
  var orlandoList = allPreviews['Orlando'] || [];
  var totalAll    = austinList.length + dallasList.length + orlandoList.length;

  /* Determine latest filing date across all cities */
  var allLeadsFlat = [].concat(austinList, dallasList, orlandoList);
  var latestDateStr = '';
  for (var i = 0; i < allLeadsFlat.length; i++) {
    var fd = allLeadsFlat[i].filing_date;
    if (fd && fd !== 'Recent' && fd > latestDateStr) {
      latestDateStr = fd;
    }
  }
  var latestFormatted = latestDateStr ? formatDate(latestDateStr) : 'Today';

  /* Update Hero Header Badge */
  var heroBadge = document.getElementById('hero-live-badge');
  if (heroBadge) {
    heroBadge.textContent = 'Municipal dockets indexed daily — ' + totalAll + ' active permits across Austin, Dallas & Orlando · Latest: ' + latestFormatted;
  }

  /* Update Section Subtitle */
  var leadsSub = document.getElementById('leads-subtitle');
  if (leadsSub) {
    leadsSub.textContent = 'Real businesses currently under construction across our covered markets. Latest filing indexed ' + latestFormatted + ' across ' + totalAll + ' active buildouts.';
  }

  /* Update City Buttons */
  var austinBtn = document.querySelector('.city-tab-btn[data-metro="Austin"]');
  if (austinBtn) austinBtn.innerHTML = 'Austin, TX <span class="opacity-60 ml-1">(' + austinList.length + ')</span>';

  var dallasBtn = document.querySelector('.city-tab-btn[data-metro="Dallas"]');
  if (dallasBtn) dallasBtn.innerHTML = 'Dallas, TX <span class="opacity-60 ml-1">(' + dallasList.length + ')</span>';

  var orlandoBtn = document.querySelector('.city-tab-btn[data-metro="Orlando"]');
  if (orlandoBtn) orlandoBtn.innerHTML = 'Orlando, FL <span class="opacity-60 ml-1">(' + orlandoList.length + ')</span>';

  /* Update Category Counters for current city */
  var currentList = allPreviews[selectedMetro] || [];
  var foodCount   = currentList.filter(function (l) { return l.category === 'Hospitality & Dining'; }).length;
  var retailCount = currentList.filter(function (l) { return l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial'; }).length;
  var healthCount = currentList.filter(function (l) { return l.category === 'Healthcare & Wellness'; }).length;

  var allCatBtn = document.querySelector('.cat-pill-btn[data-category="all"]');
  if (allCatBtn) allCatBtn.innerHTML = 'All Categories <span class="opacity-60 ml-1">(' + currentList.length + ')</span>';

  var foodCatBtn = document.querySelector('.cat-pill-btn[data-category="Hospitality & Dining"]');
  if (foodCatBtn) foodCatBtn.innerHTML = 'Restaurants &amp; Bars <span class="opacity-60 ml-1">(' + foodCount + ')</span>';

  var retailCatBtn = document.querySelector('.cat-pill-btn[data-category="Retail & Commercial Buildout"]');
  if (retailCatBtn) retailCatBtn.innerHTML = 'Retail &amp; Buildouts <span class="opacity-60 ml-1">(' + retailCount + ')</span>';

  var healthCatBtn = document.querySelector('.cat-pill-btn[data-category="Healthcare & Wellness"]');
  if (healthCatBtn) healthCatBtn.innerHTML = 'Clinics &amp; Wellness <span class="opacity-60 ml-1">(' + healthCount + ')</span>';
}

function setViewMode(mode) {
  currentViewMode = mode;
  var cardsBtn = document.getElementById('view-cards-btn');
  var tableBtn = document.getElementById('view-table-btn');

  var activeClass   = 'text-xs font-semibold px-3 py-1.5 rounded-md transition bg-white text-slate-900 shadow-sm border border-slate-200';
  var inactiveClass = 'text-xs font-semibold px-3 py-1.5 rounded-md transition text-slate-500 hover:text-slate-800';

  if (cardsBtn) cardsBtn.className = mode === 'cards' ? activeClass : inactiveClass;
  if (tableBtn) tableBtn.className = mode === 'table' ? activeClass : inactiveClass;

  renderFilteredCards();
}

function applyUserPreferences() {
  var metroInput = document.getElementById('user-metro-input');
  var catInput   = document.getElementById('user-category-input');

  if (metroInput) selectedMetro    = metroInput.value;
  if (catInput)   selectedCategory = catInput.value;

  document.querySelectorAll('.city-tab-btn').forEach(function (btn) {
    if (btn.dataset.metro === selectedMetro) {
      btn.className = 'city-tab-btn mono text-xs font-semibold px-4 py-2 rounded-lg transition bg-slate-900 text-white';
    } else {
      btn.className = 'city-tab-btn mono text-xs font-semibold px-4 py-2 rounded-lg transition bg-white hover:bg-slate-100 text-slate-600 border border-slate-200';
    }
  });

  document.querySelectorAll('.cat-pill-btn').forEach(function (btn) {
    var isActive = btn.dataset.category === selectedCategory;
    btn.className = isActive
      ? 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-slate-900 text-white'
      : 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-white hover:bg-slate-100 text-slate-600 border border-slate-200';
  });

  renderFilteredCards();
}

function setMetro(metro) {
  selectedMetro = metro;
  var metroInput = document.getElementById('user-metro-input');
  if (metroInput) metroInput.value = metro;

  document.querySelectorAll('.city-tab-btn').forEach(function (btn) {
    if (btn.dataset.metro === metro) {
      btn.className = 'city-tab-btn mono text-xs font-semibold px-4 py-2 rounded-lg transition bg-slate-900 text-white';
    } else {
      btn.className = 'city-tab-btn mono text-xs font-semibold px-4 py-2 rounded-lg transition bg-white hover:bg-slate-100 text-slate-600 border border-slate-200';
    }
  });

  updateDynamicCounters();
  renderFilteredCards();
}

function selectMetroTab(metro) {
  setMetro(metro);
}

function setCategory(category) {
  selectedCategory = category;
  var catInput = document.getElementById('user-category-input');
  if (catInput) catInput.value = category;

  document.querySelectorAll('.cat-pill-btn').forEach(function (btn) {
    var isActive = btn.dataset.category === category;
    btn.className = isActive
      ? 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-slate-900 text-white'
      : 'cat-pill-btn text-xs font-semibold px-3.5 py-1.5 rounded-lg transition bg-white hover:bg-slate-100 text-slate-600 border border-slate-200';
  });

  renderFilteredCards();
}

function selectCategoryPill(category) {
  setCategory(category);
}

function setMinVal(minVal) {
  selectedMinVal = parseInt(minVal, 10) || 0;
  renderFilteredCards();
}

function getComparableDate(lead) {
  var d = lead.filing_date;
  if (!d || d === 'Recent') {
    return (lead.created_at && lead.created_at.slice(0, 10)) || '2099-12-31';
  }
  return String(d).trim();
}

function renderFilteredCards() {
  var container = document.getElementById('leads-container');
  if (!container || !allPreviews) return;

  var leads = (allPreviews[selectedMetro] || []).filter(function (lead) {
    if (selectedCategory !== 'all' && lead.category !== selectedCategory) return false;
    if (selectedMinVal > 0 && lead.estimated_valuation < selectedMinVal) return false;
    return true;
  });

  /* Sort: NEWEST FILINGS FIRST ALWAYS */
  leads.sort(function (a, b) {
    var da = getComparableDate(a);
    var db = getComparableDate(b);
    return db < da ? -1 : db > da ? 1 : 0;
  });

  var totalCount   = leads.length;
  var displayLeads = leads.slice(0, 10);

  // Update dynamic status strip in index.html
  var matchedEl = document.getElementById('matched-lead-count');
  if (matchedEl) matchedEl.textContent = totalCount;
  var metroEl = document.getElementById('summary-metro-name');
  var stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';
  if (metroEl) metroEl.textContent = selectedMetro + ', ' + stateCode;

  if (displayLeads.length === 0) {
    container.innerHTML = '<div class="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 text-sm">No commercial buildouts match the current filters.</div>';
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
  var map = {
    'Hospitality & Dining': 'Hospitality',
    'Retail & Commercial Buildout': 'Retail',
    'Healthcare & Wellness': 'Healthcare',
    'General Commercial': 'Commercial',
    'Office & Professional Services': 'Office',
    'Industrial & Warehouse': 'Industrial'
  };
  return map[cat] || cat || 'Commercial';
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Recent') return 'Recent Filing';
  var parts = String(dateStr).trim().split('-');
  if (parts.length === 3) {
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var m = parseInt(parts[1], 10) - 1;
    if (m >= 0 && m < 12) {
      return months[m] + ' ' + parseInt(parts[2], 10) + ', ' + parts[0];
    }
  }
  return dateStr;
}

function isLeadNew(lead) {
  if (!lead.filing_date || lead.filing_date === 'Recent') return true;
  var now = Date.now();
  var d14 = 14 * 24 * 60 * 60 * 1000;
  return (now - new Date(lead.filing_date).getTime()) <= d14;
}

function renderDossierCards(leads, totalCount) {
  var stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';

  var cards = leads.map(function (lead) {
    var valText = lead.estimated_valuation
      ? '$' + Number(lead.estimated_valuation).toLocaleString()
      : 'Undisclosed';
    var formattedDate = formatDate(lead.filing_date);
    var titleClean    = cleanConceptName(lead.concept_name);
    var catLabel      = formatCategory(lead.category);
    var scope         = lead.project_description || lead.scope_of_work || '';
    var isNew         = isLeadNew(lead);
    var newBadge      = isNew ? '<span class="mono text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded ml-1.5">NEW</span>' : '';

    return '<div class="lead-card bg-white border border-slate-200 rounded-2xl p-5">'
      + '<div class="flex items-start justify-between gap-3 mb-3">'
      +   '<div class="flex-1 min-w-0">'
      +     '<div class="font-bold text-slate-900 text-base leading-snug truncate">' + escapeHtml(titleClean) + '</div>'
      +     '<div class="text-xs text-slate-500 mt-0.5 truncate">' + escapeHtml(lead.street_address || '') + ', ' + stateCode + '</div>'
      +   '</div>'
      +   '<span class="mono text-[10px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md whitespace-nowrap flex-shrink-0">'
      +     escapeHtml(catLabel)
      +   '</span>'
      + '</div>'
      + (scope ? '<div class="bg-slate-50 rounded-xl px-3.5 py-2.5 mb-3">'
      +   '<div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Permit Scope</div>'
      +   '<div class="text-xs text-slate-700 leading-relaxed">' + escapeHtml(scope) + '</div>'
      + '</div>' : '')
      + '<div class="flex items-center justify-between pt-3 border-t border-slate-100">'
      +   '<div class="flex items-center space-x-3 text-[11px] text-slate-500 mono">'
      +     (valText !== 'Undisclosed' ? '<span class="font-bold text-slate-800">' + valText + '</span>' : '')
      +     '<span>#' + escapeHtml(lead.permit_number || 'MUNI') + '</span>'
      +     '<span>Filed ' + escapeHtml(formattedDate) + newBadge + '</span>'
      +   '</div>'
      +   '<button onclick="goToPersonalizedCheckout()" class="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap">'
      +     'View Territory'
      +   '</button>'
      + '</div>'
      + '</div>';
  }).join('');

  return '<div class="space-y-3">' + cards + '</div>' + renderOverflowNotice(totalCount);
}

function renderTableView(leads, totalCount) {
  var stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';

  var tableRows = leads.map(function (lead) {
    var valText = lead.estimated_valuation
      ? '$' + Number(lead.estimated_valuation).toLocaleString()
      : '—';
    var formattedDate = formatDate(lead.filing_date);
    var titleClean    = cleanConceptName(lead.concept_name);
    var isNew         = isLeadNew(lead);
    var newBadge      = isNew ? '<span class="mono text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded ml-1">NEW</span>' : '';

    return '<tr class="hover:bg-slate-50/60 transition border-b border-slate-100 text-sm">'
      + '<td class="py-3.5 px-4 text-slate-500 whitespace-nowrap mono text-[11px]">'
      +   escapeHtml(formattedDate) + newBadge
      + '</td>'
      + '<td class="py-3.5 px-4">'
      +   '<div class="font-semibold text-slate-900 leading-snug">' + escapeHtml(titleClean) + '</div>'
      +   '<div class="text-xs text-slate-500 mt-0.5">' + escapeHtml(lead.street_address || '') + ', ' + stateCode + '</div>'
      + '</td>'
      + '<td class="py-3.5 px-4 whitespace-nowrap">'
      +   '<span class="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">' + formatCategory(lead.category) + '</span>'
      + '</td>'
      + '<td class="py-3.5 px-4 mono font-bold text-slate-900 text-xs whitespace-nowrap">'
      +   valText
      + '</td>'
      + '<td class="py-3.5 px-4 whitespace-nowrap mono text-slate-500 text-[11px]">'
      +   '#' + escapeHtml(lead.permit_number || 'MUNI')
      + '</td>'
      + '<td class="py-3.5 px-4 text-right whitespace-nowrap">'
      +   '<button onclick="goToPersonalizedCheckout()" class="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition cursor-pointer">'
      +     'Unlock Feed'
      +   '</button>'
      + '</td>'
      + '</tr>';
  }).join('');

  var tableHtml = '<div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">'
    + '<div class="overflow-x-auto">'
    +   '<table class="w-full text-left border-collapse">'
    +     '<thead>'
    +       '<tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mono">'
    +         '<th class="py-3 px-4">Filed</th>'
    +         '<th class="py-3 px-4">Business</th>'
    +         '<th class="py-3 px-4">Type</th>'
    +         '<th class="py-3 px-4">Budget</th>'
    +         '<th class="py-3 px-4">Permit</th>'
    +         '<th class="py-3 px-4 text-right">Action</th>'
    +       '</tr>'
    +     '</thead>'
    +     '<tbody>'
    +       tableRows
    +     '</tbody>'
    +   '</table>'
    + '</div>'
    + '</div>';

  return tableHtml + renderOverflowNotice(totalCount);
}

function renderOverflowNotice(totalCount) {
  if (totalCount <= 10) return '';
  var stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';
  var hidden = totalCount - 10;
  return '<div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mt-4">'
    + '<div class="max-w-lg mx-auto">'
    +   '<div class="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 mono">Preview Limited to 10 Records</div>'
    +   '<h3 class="text-xl font-bold text-slate-900 mb-2">'
    +     hidden + ' additional buildouts in ' + selectedMetro + ', ' + stateCode + ' not shown'
    +   '</h3>'
    +   '<p class="text-sm text-slate-600 leading-relaxed mb-5">'
    +     'Full access includes all ' + totalCount + ' active permit records with jobsite addresses, contractor names, project budgets, and CSV export. New permits are indexed every morning from official city hall dockets.'
    +   '</p>'
    +   '<button onclick="goToPersonalizedCheckout()" class="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-lg transition cursor-pointer">'
    +     'Check Territory Availability'
    +   '</button>'
    +   '<div class="mt-4 flex items-center justify-center space-x-4 text-[11px] text-slate-400 mono">'
    +     '<span>Official municipal records</span>'
    +     '<span>·</span>'
    +     '<span>One licensee per industry</span>'
    +     '<span>·</span>'
    +     '<span>7-day trial for $1</span>'
    +   '</div>'
    + '</div>'
    + '</div>';
}

function goToPersonalizedCheckout() {
  var metroInput = document.getElementById('user-metro-input');
  var catInput   = document.getElementById('user-category-input');

  var metro    = metroInput ? metroInput.value : selectedMetro;
  var category = catInput   ? catInput.value   : selectedCategory;

  sessionStorage.setItem('custom_pref_metro',    metro);
  sessionStorage.setItem('custom_pref_category', category);

  window.location.href = 'checkout.html?metro=' + encodeURIComponent(metro) + '&category=' + encodeURIComponent(category);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderFallbackCards() {
  var container = document.getElementById('leads-container');
  if (container) {
    container.innerHTML = '<div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400 mono">'
      + 'Loading permit records from city dockets...'
      + '</div>';
  }
}

// Global window bindings for onclick
window.selectMetroTab = selectMetroTab;
window.selectCategoryPill = selectCategoryPill;
window.setMetro = setMetro;
window.setCategory = setCategory;
window.setViewMode = setViewMode;
window.applyUserPreferences = applyUserPreferences;
window.goToPersonalizedCheckout = goToPersonalizedCheckout;

document.addEventListener('DOMContentLoaded', initShowcase);
