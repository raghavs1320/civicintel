/**
 * CivicIntel Commercial Intelligence Systems
 * Public Leads Explorer & Showcase Engine
 * Powers dynamic multi-metro filtering, live count aggregation,
 * dual view modes (Card View vs Table View), and $1 trial checkout conversion.
 */

let allPreviews = {};
let selectedMetro = 'Austin';
let selectedCategory = 'all';
let selectedMinVal = 0;
let currentViewMode = 'cards'; // 'cards' or 'table'

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

  const austinList = allPreviews['Austin'] || [];
  const dallasList = allPreviews['Dallas'] || [];
  const orlandoList = allPreviews['Orlando'] || [];

  // Update city buttons with dynamic counts
  const austinBtn = document.querySelector('.city-tab-btn[data-metro="Austin"]');
  if (austinBtn) {
    austinBtn.innerHTML = `<span>Austin, TX</span> <span class="opacity-80 font-mono text-xs">(${austinList.length} Leads)</span>`;
  }

  const dallasBtn = document.querySelector('.city-tab-btn[data-metro="Dallas"]');
  if (dallasBtn) {
    dallasBtn.innerHTML = `<span>Dallas, TX</span> <span class="opacity-80 font-mono text-xs">(${dallasList.length} Leads)</span>`;
  }

  const orlandoBtn = document.querySelector('.city-tab-btn[data-metro="Orlando"]');
  if (orlandoBtn) {
    orlandoBtn.innerHTML = `<span>Orlando, FL</span> <span class="opacity-80 font-mono text-xs">(${orlandoList.length} Leads)</span>`;
  }

  // Update category buttons for currently selected metro
  const currentList = allPreviews[selectedMetro] || [];
  const foodCount = currentList.filter(l => l.category === 'Hospitality & Dining').length;
  const retailCount = currentList.filter(l => l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial').length;
  const healthCount = currentList.filter(l => l.category === 'Healthcare & Wellness').length;

  const allCatBtn = document.querySelector('.cat-pill-btn[data-category="all"]');
  if (allCatBtn) allCatBtn.innerHTML = `All Businesses <span class="text-xs opacity-75 font-mono">(${currentList.length})</span>`;

  const foodCatBtn = document.querySelector('.cat-pill-btn[data-category="Hospitality & Dining"]');
  if (foodCatBtn) foodCatBtn.innerHTML = `Restaurants &amp; Bars <span class="text-xs opacity-75 font-mono">(${foodCount})</span>`;

  const retailCatBtn = document.querySelector('.cat-pill-btn[data-category="Retail & Commercial Buildout"]');
  if (retailCatBtn) retailCatBtn.innerHTML = `Retail Stores <span class="text-xs opacity-75 font-mono">(${retailCount})</span>`;

  const healthCatBtn = document.querySelector('.cat-pill-btn[data-category="Healthcare & Wellness"]');
  if (healthCatBtn) healthCatBtn.innerHTML = `Clinics &amp; Gyms <span class="text-xs opacity-75 font-mono">(${healthCount})</span>`;
}

function setViewMode(mode) {
  currentViewMode = mode;
  const cardsBtn = document.getElementById('view-cards-btn');
  const tableBtn = document.getElementById('view-table-btn');

  if (mode === 'cards') {
    if (cardsBtn) cardsBtn.className = "text-xs font-bold px-3 py-1.5 rounded-md transition bg-white text-slate-900 shadow-xs";
    if (tableBtn) tableBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-md transition text-slate-600 hover:text-slate-900";
  } else {
    if (cardsBtn) cardsBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-md transition text-slate-600 hover:text-slate-900";
    if (tableBtn) tableBtn.className = "text-xs font-bold px-3 py-1.5 rounded-md transition bg-white text-slate-900 shadow-xs";
  }

  renderFilteredCards();
}

function applyUserPreferences() {
  const metroInput = document.getElementById('user-metro-input');
  const catInput = document.getElementById('user-category-input');

  if (metroInput) selectedMetro = metroInput.value;
  if (catInput) selectedCategory = catInput.value;

  // Sync city tabs styling
  document.querySelectorAll('.city-tab-btn').forEach(btn => {
    if (btn.dataset.metro === selectedMetro) {
      btn.className = "city-tab-btn text-sm font-bold px-5 py-2.5 rounded-xl transition bg-slate-900 text-white shadow-xs flex items-center space-x-1.5";
    } else {
      btn.className = "city-tab-btn text-sm font-bold px-5 py-2.5 rounded-xl transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1.5";
    }
  });

  // Sync category pills styling
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    if (btn.dataset.category === selectedCategory) {
      btn.className = "cat-pill-btn text-sm font-bold px-4 py-2 rounded-xl transition bg-emerald-600 text-white shadow-xs";
    } else {
      btn.className = "cat-pill-btn text-sm font-bold px-4 py-2 rounded-xl transition bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs";
    }
  });

  updateDynamicCounters();

  // Update showcase heading if present
  const heading = document.getElementById('showcase-heading');
  const catLabels = {
    'all': 'All Businesses',
    'Hospitality & Dining': 'Restaurants & Bars',
    'Retail & Commercial Buildout': 'Retail Stores',
    'Healthcare & Wellness': 'Clinics & Gyms'
  };
  if (heading) {
    heading.textContent = `${catLabels[selectedCategory] || selectedCategory} in ${selectedMetro}`;
  }

  renderFilteredCards();
}

function selectMetroTab(metro) {
  const metroInput = document.getElementById('user-metro-input');
  if (metroInput) metroInput.value = metro;
  applyUserPreferences();
}

function selectCategoryPill(category) {
  const catInput = document.getElementById('user-category-input');
  if (catInput) catInput.value = category;
  applyUserPreferences();
}

function renderFilteredCards() {
  const container = document.getElementById('leads-container');
  const rawList = allPreviews[selectedMetro] || [];

  // Filter based on preferences
  const matched = rawList.filter(lead => {
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'Retail & Commercial Buildout') {
        if (lead.category !== 'Retail & Commercial Buildout' && lead.category !== 'General Commercial') {
          return false;
        }
      } else if (lead.category !== selectedCategory) {
        return false;
      }
    }
    return true;
  });

  // Sort by newest filing first, handling 'Recent' gracefully
  matched.sort((a, b) => {
    const scoreDiff = (b.priority_score || 0) - (a.priority_score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const dateA = a.filing_date && a.filing_date !== 'Recent' ? a.filing_date : '0000-00-00';
    const dateB = b.filing_date && b.filing_date !== 'Recent' ? b.filing_date : '0000-00-00';
    return dateB.localeCompare(dateA);
  });

  // Update count badge & notification box
  const countBadge = document.getElementById('matched-lead-count');
  if (countBadge) countBadge.textContent = matched.length;

  const notifText = document.getElementById('filter-notif-text');
  if (notifText) {
    const stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';
    const catLabel = selectedCategory === 'all' ? 'businesses' : selectedCategory.toLowerCase();
    const countDisplay = Math.min(10, matched.length);
    notifText.innerHTML = `Showing ${countDisplay} of <strong class="text-slate-900 font-bold">${matched.length}</strong> ${escapeHtml(catLabel)} opening soon in <strong class="text-slate-900 font-bold">${selectedMetro}, ${stateCode}</strong>`;
  }

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-xs">
        <h4 class="text-base font-bold text-slate-900 mb-1">No Businesses Matched This Category</h4>
        <p class="text-sm text-slate-500 max-w-md mx-auto">
          We found businesses in ${selectedMetro}, but none matching "${selectedCategory}". 
          Try selecting "All Businesses" or switching cities above.
        </p>
      </div>
    `;
    return;
  }

  // Display top 10 verified leads for a clean executive preview
  const displayList = matched.slice(0, 10);

  if (currentViewMode === 'table') {
    container.innerHTML = renderTableView(displayList, matched.length);
  } else {
    container.innerHTML = renderDossierCards(displayList, matched.length);
  }
}

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Recent') return 'Recent';
  const parts = String(dateStr).trim().split('-');
  if (parts.length === 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const m = parseInt(parts[1], 10) - 1;
    if (m >= 0 && m < 12) {
      return `${months[m]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
    }
  }
  return dateStr;
}

function getCleanContactName(lead) {
  const name = (lead.decision_maker_name || '').trim();
  const concept = (lead.concept_name || '').trim().toLowerCase();
  const lower = name.toLowerCase();
  if (!name || lower === concept || name.length > 35 || /remodel|finish|tenant|condo|interior|commercial|building|suite|scope|install|restroom|kitchen|addition|alteration|renovation|repair|permit|project|storefront|warehouse/i.test(name)) {
    return 'Business Owner';
  }
  return name;
}

function cleanConceptName(text) {
  if (!text) return 'New Commercial Business';
  let t = String(text).trim();
  t = t.replace(/^(ePlan:\s*)?(Commercial\s+)?Expedited\s+Review\s*[-–:]\s*/i, '');
  t = t.replace(/^(QTEAM\s+INHOUSE|QTEAM|NSFAA|DSST|BU\s+ZO|MCR\s+W\/BATTERY|PEXP)[\s\-_/:]*/i, '');
  t = t.replace(/^(THIS PROJECT CONSISTS OF A|SCOPE CONSISTS OF)\s+/i, '');
  t = t.replace(/^(NEW CONSTRUCTION OF A|CONSTRUCTION OF)\s+/i, 'New ');
  t = t.replace(/\s+/g, ' ').trim();

  // If ALL CAPS and longer than 5 chars, convert to readable Title Case
  if (t === t.toUpperCase() && t.length > 5) {
    t = t.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
  }
  return t.length > 95 ? t.slice(0, 95) + '…' : t;
}

function cleanScopeDescription(lead) {
  let text = (lead.concept_snapshot || lead.work_description || '').trim();
  const match = text.match(/undergoing commercial buildout \((.*?)\)\.?$/i);
  if (match && match[1]) {
    text = match[1].trim();
  }
  text = text.replace(/^(ePlan:\s*)?(Commercial\s+)?Expedited\s+Review\s*[-–:]\s*/i, '');
  text = text.replace(/^(QTEAM\s+INHOUSE|QTEAM|NSFAA|DSST|BU\s+ZO|PEXP)[\s\-_/:]*/i, '');
  text = text.replace(/^(THIS PROJECT CONSISTS OF A|SCOPE CONSISTS OF)\s+/i, '');
  text = text.replace(/\s+/g, ' ').trim();

  if (!text || text.toLowerCase() === (lead.concept_name || '').toLowerCase() || text.length < 10) {
    if (lead.category === 'Hospitality & Dining') {
      return 'Opening a new restaurant or bar with commercial kitchen and dining buildout.';
    } else if (lead.category === 'Healthcare & Wellness') {
      return 'Opening a new clinic, medical office, or fitness facility with interior remodel.';
    } else {
      return 'Commercial store remodel, interior finish-out, and tenant improvement.';
    }
  }
  return text.length > 180 ? text.slice(0, 180) + '…' : text;
}

function formatCategory(cat) {
  if (cat === 'Hospitality & Dining') return 'Restaurant & Bar';
  if (cat === 'Retail & Commercial Buildout' || cat === 'General Commercial') return 'Retail Store';
  if (cat === 'Healthcare & Wellness') return 'Clinic & Wellness';
  return 'Commercial Buildout';
}

function formatValuation(val) {
  if (val && Number(val) > 0) {
    return `$${Number(val).toLocaleString()} project`;
  }
  return 'Complete Buildout';
}

function renderDossierCards(displayList, totalCount) {
  const cardsHtml = displayList.map((lead) => {
    const formattedDate = formatDate(lead.filing_date);
    const contactName = getCleanContactName(lead);
    const titleClean = cleanConceptName(lead.concept_name);
    const scopeClean = cleanScopeDescription(lead);

    return `
      <article class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 sm:p-7 transition shadow-xs hover:shadow-md text-left">
        
        <!-- Header Line: Category, Date, Budget -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 text-sm">
          <div class="flex items-center space-x-2 text-slate-500">
            <span class="font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs">
              ${formatCategory(lead.category)}
            </span>
            <span class="text-slate-300">•</span>
            <span class="font-medium text-slate-600">Filed on ${escapeHtml(formattedDate)}</span>
          </div>

          <div class="font-bold text-slate-900 text-sm">
            ${formatValuation(lead.estimated_valuation)}
          </div>
        </div>

        <!-- Business Name & Location -->
        <div class="mt-4">
          <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
            ${escapeHtml(titleClean)}
          </h3>
          <p class="text-sm sm:text-base text-slate-500 mt-1 font-medium">
            ${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}
          </p>
        </div>

        <!-- What they are opening (Plain English) -->
        <p class="text-sm sm:text-base text-slate-700 mt-3.5 leading-relaxed">
          ${escapeHtml(scopeClean)}
        </p>

        <!-- Decision Maker & Phone Number Bar -->
        <div class="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
              👤
            </div>
            <div>
              <span class="font-bold text-slate-900 text-sm sm:text-base">${escapeHtml(contactName)}</span>
              <span class="text-slate-500 text-xs sm:text-sm ml-1">• Business Owner</span>
            </div>
          </div>

          <div class="flex items-center space-x-3">
            <span class="font-mono text-sm font-bold text-slate-800 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl">
              ${lead.display_phone}
            </span>
            <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm px-4 py-2 rounded-xl transition shadow-xs flex items-center space-x-1 cursor-pointer">
              <span>Unlock Phone Number</span>
              <span>→</span>
            </button>
          </div>
        </div>

      </article>
    `;
  }).join('');

  return cardsHtml + renderOverflowNotice(totalCount);
}

function renderTableView(displayList, totalCount) {
  const tableRows = displayList.map(lead => {
    const valText = lead.estimated_valuation ? `$${Number(lead.estimated_valuation).toLocaleString()}` : 'Buildout';
    const formattedDate = formatDate(lead.filing_date);
    const contactName = getCleanContactName(lead);
    const titleClean = cleanConceptName(lead.concept_name);

    return `
      <tr class="hover:bg-slate-50/75 transition border-b border-slate-100 text-sm">
        <td class="py-4 px-4 text-slate-500 whitespace-nowrap font-medium text-xs">
          ${escapeHtml(formattedDate)}
        </td>
        <td class="py-4 px-4">
          <div class="font-bold text-slate-900 leading-snug">${escapeHtml(titleClean)}</div>
          <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(lead.street_address)}, ${lead.state}</div>
        </td>
        <td class="py-4 px-4 text-slate-700 whitespace-nowrap text-xs font-semibold">
          ${formatCategory(lead.category)}
        </td>
        <td class="py-4 px-4 font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
          ${valText}
        </td>
        <td class="py-4 px-4 whitespace-nowrap font-medium text-slate-800 text-xs">
          ${escapeHtml(contactName)}
        </td>
        <td class="py-4 px-4 whitespace-nowrap font-mono text-slate-800 font-bold text-xs">
          ${lead.display_phone}
        </td>
        <td class="py-4 px-4 text-right whitespace-nowrap">
          <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer">
            Unlock Phone →
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const tableHtml = `
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th class="py-3 px-4">Date</th>
              <th class="py-3 px-4">Business &amp; Address</th>
              <th class="py-3 px-4">Type</th>
              <th class="py-3 px-4">Budget</th>
              <th class="py-3 px-4">Owner</th>
              <th class="py-3 px-4">Phone</th>
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
  return `
    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center my-6">
      <div class="max-w-xl mx-auto">
        <h3 class="text-xl font-bold text-slate-900">
          Showing 10 of ${totalCount} new businesses opening in ${selectedMetro}, ${stateCode}
        </h3>
        <p class="text-sm text-slate-600 mt-2 mb-5 leading-relaxed">
          New businesses are added every morning. Start your 7-day trial for $1.00 to unlock direct cell phone numbers for all ${totalCount} businesses and receive automated daily lead alerts.
        </p>
        <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-xs cursor-pointer inline-flex items-center space-x-1.5">
          <span>Unlock All ${totalCount} Leads for $1.00</span>
          <span>→</span>
        </button>
        <div class="mt-4 flex items-center justify-center space-x-3 text-xs text-slate-500">
          <span>Daily morning updates</span>
          <span>•</span>
          <span>1 rep per industry lock</span>
          <span>•</span>
          <span>Cancel anytime in 1 click</span>
        </div>
      </div>
    </div>
  `;
}

function goToPersonalizedCheckout() {
  const metroInput = document.getElementById('user-metro-input');
  const catInput = document.getElementById('user-category-input');

  const metro = metroInput ? metroInput.value : selectedMetro;
  const category = catInput ? catInput.value : selectedCategory;

  sessionStorage.setItem('custom_pref_metro', metro);
  sessionStorage.setItem('custom_pref_category', category);

  window.location.href = `checkout.html?metro=${encodeURIComponent(metro)}&category=${encodeURIComponent(category)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function renderFallbackCards() {
  const container = document.getElementById('leads-container');
  if (container) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        Loading live leads from city records...
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', initShowcase);
