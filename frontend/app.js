/**
 * CivicIntel Commercial Intelligence Systems
 * Institutional B2B Pre-Opening Permitting Showcase Engine
 * Powers dynamic multi-metro filtering, live count aggregation,
 * dual view modes (Dossier View vs Terminal Table View), and trial conversion.
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

  const dallasVal = dallasList.reduce((acc, l) => acc + (l.estimated_valuation || 0), 0);
  const orlandoVal = orlandoList.reduce((acc, l) => acc + (l.estimated_valuation || 0), 0);

  // Update city buttons with dynamic counts
  const austinBtn = document.querySelector('.city-tab-btn[data-metro="Austin"]');
  if (austinBtn) {
    austinBtn.innerHTML = `<span>Austin, TX</span> <span class="opacity-80 font-mono text-[11px]">(${austinList.length} Filings)</span>`;
  }

  const dallasBtn = document.querySelector('.city-tab-btn[data-metro="Dallas"]');
  if (dallasBtn) {
    const dValFormatted = dallasVal > 0 ? ` • $${(dallasVal / 1e6).toFixed(1)}M` : '';
    dallasBtn.innerHTML = `<span>Dallas, TX</span> <span class="opacity-80 font-mono text-[11px]">(${dallasList.length}${dValFormatted})</span>`;
  }

  const orlandoBtn = document.querySelector('.city-tab-btn[data-metro="Orlando"]');
  if (orlandoBtn) {
    const oValFormatted = orlandoVal > 0 ? ` • $${(orlandoVal / 1e6).toFixed(1)}M` : '';
    orlandoBtn.innerHTML = `<span>Orlando, FL</span> <span class="opacity-80 font-mono text-[11px]">(${orlandoList.length}${oValFormatted})</span>`;
  }

  // Update category buttons for currently selected metro
  const currentList = allPreviews[selectedMetro] || [];
  const foodCount = currentList.filter(l => l.category === 'Hospitality & Dining').length;
  const retailCount = currentList.filter(l => l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial').length;
  const healthCount = currentList.filter(l => l.category === 'Healthcare & Wellness').length;

  const allCatBtn = document.querySelector('.cat-pill-btn[data-category="all"]');
  if (allCatBtn) allCatBtn.innerHTML = `All Commercial <span class="text-[10px] opacity-75 font-mono">(${currentList.length})</span>`;

  const foodCatBtn = document.querySelector('.cat-pill-btn[data-category="Hospitality & Dining"]');
  if (foodCatBtn) foodCatBtn.innerHTML = `Restaurants &amp; Bars <span class="text-[10px] opacity-75 font-mono">(${foodCount})</span>`;

  const retailCatBtn = document.querySelector('.cat-pill-btn[data-category="Retail & Commercial Buildout"]');
  if (retailCatBtn) retailCatBtn.innerHTML = `Retail &amp; Commercial <span class="text-[10px] opacity-75 font-mono">(${retailCount})</span>`;

  const healthCatBtn = document.querySelector('.cat-pill-btn[data-category="Healthcare & Wellness"]');
  if (healthCatBtn) healthCatBtn.innerHTML = `Healthcare &amp; Clinics <span class="text-[10px] opacity-75 font-mono">(${healthCount})</span>`;
}

function setViewMode(mode) {
  currentViewMode = mode;
  const cardsBtn = document.getElementById('view-cards-btn');
  const tableBtn = document.getElementById('view-table-btn');

  if (mode === 'cards') {
    if (cardsBtn) cardsBtn.className = "text-xs font-bold px-3 py-1 rounded-md transition bg-white text-slate-900 shadow-sm";
    if (tableBtn) tableBtn.className = "text-xs font-semibold px-3 py-1 rounded-md transition text-slate-600 hover:text-slate-900";
  } else {
    if (cardsBtn) cardsBtn.className = "text-xs font-semibold px-3 py-1 rounded-md transition text-slate-600 hover:text-slate-900";
    if (tableBtn) tableBtn.className = "text-xs font-bold px-3 py-1 rounded-md transition bg-white text-slate-900 shadow-sm";
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
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2 rounded-lg transition bg-slate-900 text-white shadow-sm flex items-center space-x-1";
    } else {
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2 rounded-lg transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1";
    }
  });

  // Sync category pills styling
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    if (btn.dataset.category === selectedCategory) {
      btn.className = "cat-pill-btn text-xs font-bold px-3.5 py-1.5 rounded-lg transition bg-emerald-600 text-white shadow-sm";
    } else {
      btn.className = "cat-pill-btn text-xs font-bold px-3.5 py-1.5 rounded-lg transition bg-white hover:bg-slate-50 text-slate-600 border border-slate-200";
    }
  });

  updateDynamicCounters();

  // Update showcase heading if present
  const heading = document.getElementById('showcase-heading');
  const catLabels = {
    'all': 'All Commercial Projects',
    'Hospitality & Dining': 'Food & Beverage Openings',
    'Retail & Commercial Buildout': 'Retail & Commercial Finish-Outs',
    'Healthcare & Wellness': 'Healthcare, Medical & Clinics'
  };
  if (heading) {
    heading.textContent = `${catLabels[selectedCategory] || selectedCategory} in ${selectedMetro} (Top 10 Filings)`;
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

  // Sort by priority and newest filing
  matched.sort((a, b) => {
    const scoreDiff = (b.priority_score || 0) - (a.priority_score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    const dateA = a.filing_date && a.filing_date !== 'Recent' ? a.filing_date : '0000-00-00';
    const dateB = b.filing_date && b.filing_date !== 'Recent' ? b.filing_date : '0000-00-00';
    return dateB.localeCompare(dateA);
  });

  // Calculate pipeline valuation
  const totalValuation = matched.reduce((acc, lead) => acc + (lead.estimated_valuation || 0), 0);
  const valString = totalValuation > 0 ? ` • $${(totalValuation / 1e6).toFixed(1)}M Pipeline` : '';

  // Update count badge & notification box
  const countBadge = document.getElementById('matched-lead-count');
  if (countBadge) countBadge.textContent = matched.length;

  const notifText = document.getElementById('filter-notif-text');
  if (notifText) {
    const stateCode = selectedMetro === 'Orlando' ? 'FL' : 'TX';
    const catLabel = selectedCategory === 'all' ? 'commercial' : selectedCategory.toLowerCase();
    const countDisplay = Math.min(10, matched.length);
    notifText.innerHTML = `Showing top <strong class="text-slate-900 font-bold">${countDisplay}</strong> of <strong class="text-slate-900 font-bold">${matched.length}</strong> ${escapeHtml(catLabel)} filings in <strong class="text-slate-900 font-bold">${selectedMetro}, ${stateCode}</strong>${valString}`;
  }

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-xs">
        <h4 class="text-sm font-bold text-slate-900 mb-1">No Filings Matched This Vertical</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          We found filings in ${selectedMetro}, but none matching "${selectedCategory}". 
          Try selecting "All Commercial" or switching cities above.
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
    return 'Managing Principal';
  }
  return name;
}

function renderDossierCards(displayList, totalCount) {
  const cardsHtml = displayList.map((lead) => {
    const formattedValuation = lead.estimated_valuation ? `
      <span class="font-mono text-xs font-bold text-slate-900">
        $${Number(lead.estimated_valuation).toLocaleString()}
      </span>
    ` : `
      <span class="text-xs font-medium text-slate-500">
        Commercial Finish-Out
      </span>
    `;

    const formattedDate = formatDate(lead.filing_date);
    const contactName = getCleanContactName(lead);

    return `
      <article class="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-5 transition shadow-xs hover:shadow-sm">
        
        <!-- Header Row: Metadata & Valuation -->
        <div class="flex items-center justify-between text-xs text-slate-500 pb-2.5 border-b border-slate-100">
          <div class="flex items-center space-x-2 flex-wrap">
            <span class="font-mono text-slate-400">#${escapeHtml(lead.permit_number || '2026-MUNI')}</span>
            <span class="text-slate-300">•</span>
            <span class="font-medium text-slate-700">${escapeHtml(lead.category || 'Commercial')}</span>
            <span class="text-slate-300">•</span>
            <span>Filed ${escapeHtml(formattedDate)}</span>
          </div>

          <div>
            ${formattedValuation}
          </div>
        </div>

        <!-- Entity & Location -->
        <div class="mt-3">
          <h3 class="text-base font-bold text-slate-900 tracking-tight leading-snug">
            ${escapeHtml(lead.concept_name)}
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            ${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}
          </p>
        </div>

        <!-- Municipal Scope -->
        <p class="text-xs text-slate-600 mt-2.5 leading-relaxed">
          ${escapeHtml(lead.concept_snapshot || lead.work_description || 'Commercial interior alteration and equipment fit-out.')}
        </p>

        <!-- Decision Maker & Action Bar -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-2 text-slate-700">
            <span class="font-semibold text-slate-900">${escapeHtml(contactName)}</span>
            <span class="text-slate-400 text-[11px]">• ${escapeHtml(lead.decision_maker_title || 'Operating Principal')}</span>
          </div>

          <div class="flex items-center space-x-3">
            <span class="font-mono text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded">
              ${lead.display_phone}
            </span>
            <button onclick="goToPersonalizedCheckout()" class="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center space-x-1 group">
              <span>Unlock Phone</span>
              <span class="transition-transform group-hover:translate-x-0.5">→</span>
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
    const valText = lead.estimated_valuation ? `$${Number(lead.estimated_valuation).toLocaleString()}` : 'Finish-Out';
    const formattedDate = formatDate(lead.filing_date);
    const contactName = getCleanContactName(lead);
    return `
      <tr class="hover:bg-slate-50/75 transition border-b border-slate-100 text-xs">
        <td class="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
          ${escapeHtml(formattedDate)}
        </td>
        <td class="py-3 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
          #${escapeHtml(lead.permit_number || '2026-MUNI')}
        </td>
        <td class="py-3 px-3">
          <div class="font-bold text-slate-900 leading-snug">${escapeHtml(lead.concept_name)}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(lead.street_address)}, ${lead.state}</div>
        </td>
        <td class="py-3 px-3 text-slate-600 whitespace-nowrap">
          ${escapeHtml(lead.category || 'Commercial')}
        </td>
        <td class="py-3 px-3 font-mono font-bold text-slate-900 text-[11px] whitespace-nowrap">
          ${valText}
        </td>
        <td class="py-3 px-3">
          <div class="font-semibold text-slate-900">${escapeHtml(contactName)}</div>
          <div class="text-[11px] text-slate-400">${escapeHtml(lead.decision_maker_title || 'Operating Principal')}</div>
        </td>
        <td class="py-3 px-3 whitespace-nowrap font-mono text-slate-700 text-[11px]">
          ${lead.display_phone}
        </td>
        <td class="py-3 px-3 text-right whitespace-nowrap">
          <button onclick="goToPersonalizedCheckout()" class="text-xs font-bold text-emerald-700 hover:text-emerald-800">
            Unlock →
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const tableHtml = `
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-2.5 px-3">Date</th>
              <th class="py-2.5 px-3">Docket</th>
              <th class="py-2.5 px-3">Project &amp; Location</th>
              <th class="py-2.5 px-3">Category</th>
              <th class="py-2.5 px-3">Valuation</th>
              <th class="py-2.5 px-3">Decision Maker</th>
              <th class="py-2.5 px-3">Phone</th>
              <th class="py-2.5 px-3 text-right">Action</th>
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
    <div class="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center my-6">
      <div class="max-w-xl mx-auto">
        <h3 class="text-base font-bold text-slate-900">
          Viewing top 10 of ${totalCount} active commercial filings in ${selectedMetro}, ${stateCode}
        </h3>
        <p class="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          New municipal filings are ingested and unmasked every morning. Activate your territory license to unlock direct cell phone numbers for all ${totalCount} projects and receive automated daily lead alerts.
        </p>
        <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm cursor-pointer inline-flex items-center space-x-1.5">
          <span>Unlock All ${totalCount} Leads for $1.00</span>
          <span>→</span>
        </button>
        <div class="mt-3 flex items-center justify-center space-x-3 text-[11px] text-slate-400">
          <span>Daily automated updates</span>
          <span>•</span>
          <span>1 exclusive rep per category</span>
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

function renderFallbackCards() {
  const container = document.getElementById('leads-container');
  if (container) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
        Failed to load live preview records. Please refresh or check back shortly.
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', initShowcase);
