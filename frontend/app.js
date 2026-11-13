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
    if (cardsBtn) cardsBtn.className = "text-xs font-bold px-3 py-1.5 rounded-lg transition bg-white text-slate-900 shadow-sm flex items-center space-x-1.5";
    if (tableBtn) tableBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center space-x-1.5";
  } else {
    if (cardsBtn) cardsBtn.className = "text-xs font-semibold px-3 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center space-x-1.5";
    if (tableBtn) tableBtn.className = "text-xs font-bold px-3 py-1.5 rounded-lg transition bg-white text-slate-900 shadow-sm flex items-center space-x-1.5";
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
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2.5 rounded-xl transition bg-slate-900 text-white shadow-sm flex items-center space-x-1.5";
    } else {
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2.5 rounded-xl transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center space-x-1.5";
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

  // Update showcase heading
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
    return (b.filing_date || '').localeCompare(a.filing_date || '');
  });

  // Calculate pipeline valuation
  const totalValuation = matched.reduce((acc, lead) => acc + (lead.estimated_valuation || 0), 0);
  const valString = totalValuation > 0 ? ` ($${Math.round(totalValuation).toLocaleString()} Pipeline)` : '';

  // Update count badge & notification box
  const countBadge = document.getElementById('matched-lead-count');
  if (countBadge) countBadge.textContent = matched.length;

  const notifText = document.getElementById('filter-notif-text');
  if (notifText) {
    notifText.innerHTML = `Showing <strong class="text-slate-900 font-bold">${matched.length}</strong> active pre-opening projects${valString} in ${selectedMetro}.`;
  }

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
        <div class="w-12 h-12 mx-auto mb-3 text-slate-400 flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <h4 class="text-base font-bold text-slate-900 mb-1">No Filings Matched This Vertical</h4>
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

function getVendorSignals(category) {
  if (category === 'Hospitality & Dining') {
    return [
      { name: 'POS & KDS Systems', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      { name: 'Broadline Food Supply', class: 'bg-amber-50 text-amber-800 border-amber-200' },
      { name: 'Commercial Kitchen Hoods', class: 'bg-blue-50 text-blue-800 border-blue-200' },
      { name: 'Liquor Liability Insurance', class: 'bg-purple-50 text-purple-800 border-purple-200' }
    ];
  } else if (category === 'Healthcare & Wellness') {
    return [
      { name: 'Commercial Janitorial', class: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
      { name: 'HIPAA Security & CCTV', class: 'bg-blue-50 text-blue-800 border-blue-200' },
      { name: 'Medical Facility Insurance', class: 'bg-purple-50 text-purple-800 border-purple-200' },
      { name: 'Storefront Signage', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    ];
  } else {
    return [
      { name: 'Storefront Signage', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      { name: 'Commercial Property Insurance', class: 'bg-purple-50 text-purple-800 border-purple-200' },
      { name: 'Retail POS & Merchant Rates', class: 'bg-blue-50 text-blue-800 border-blue-200' },
      { name: 'Post-Construction Cleaning', class: 'bg-amber-50 text-amber-800 border-amber-200' }
    ];
  }
}

function renderDossierCards(displayList, totalCount) {
  const cardsHtml = displayList.map((lead) => {
    const signals = getVendorSignals(lead.category);
    const vendorBadges = signals.map(s => 
      `<span class="text-[10px] font-semibold px-2 py-0.5 rounded border ${s.class}">${s.name}</span>`
    ).join('');

    const formattedValuation = lead.estimated_valuation ? `
      <span class="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
        $${Number(lead.estimated_valuation).toLocaleString()} Valuation
      </span>
    ` : `
      <span class="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
        Commercial Interior Finish-Out
      </span>
    `;

    return `
      <article class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition duration-150 shadow-sm hover:shadow-md overflow-hidden">
        
        <!-- TOP EXECUTIVE HEADER STRIP -->
        <div class="bg-slate-50/80 border-b border-slate-100 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-2.5 flex-wrap">
            <span class="font-bold text-[10px] uppercase tracking-wider bg-white text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-md">
              ${escapeHtml(lead.category || 'Commercial Buildout')}
            </span>
            <span class="text-slate-300 font-mono text-[11px]">•</span>
            <span class="font-mono text-slate-600 text-[11px] font-medium flex items-center space-x-1">
              <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              <span>Docket #${escapeHtml(lead.permit_number || '2026-MUNI')}</span>
            </span>
            <span class="text-slate-300 font-mono text-[11px]">•</span>
            <span class="text-slate-600 text-[11px] font-medium flex items-center space-x-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>Registered: ${escapeHtml(lead.filing_date || 'Active Docket')}</span>
            </span>
          </div>

          <div class="flex items-center space-x-2">
            ${formattedValuation}
          </div>
        </div>

        <!-- MAIN BODY -->
        <div class="p-6">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
            <div>
              <h3 class="text-lg font-bold text-slate-900 tracking-tight leading-snug">
                ${escapeHtml(lead.concept_name)}
              </h3>
              <p class="text-xs text-slate-600 mt-1 flex items-center space-x-1.5 font-medium">
                <svg class="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}</span>
              </p>
            </div>
            <span class="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 self-start whitespace-nowrap">
              Active Pre-Opening Buildout
            </span>
          </div>

          <!-- 3-COLUMN STRUCTURED INTELLIGENCE GRID -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100 text-xs">
            
            <!-- COL 1: DECISION MAKER -->
            <div class="space-y-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Decision Maker on Record</div>
              <div class="font-bold text-slate-900 text-sm">${escapeHtml(lead.decision_maker_name || 'Managing Principal')}</div>
              <div class="text-[11px] text-slate-500">${escapeHtml(lead.decision_maker_title || 'Operating Principal / Licensee')}</div>
              <div class="pt-1 flex items-center space-x-2">
                <span class="font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  ${lead.display_phone}
                </span>
                <button onclick="goToPersonalizedCheckout()" class="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-500/40 hover:decoration-emerald-700">
                  Unlock Cell ➔
                </button>
              </div>
            </div>

            <!-- COL 2: BUILDOUT TIMELINE & HORIZON -->
            <div class="space-y-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buildout Stage &amp; Scope</div>
              <div class="font-semibold text-slate-800">${escapeHtml(lead.work_type || 'Commercial Alteration')}</div>
              <div class="text-[11px] text-slate-600">
                <span class="text-slate-400">Launch Horizon:</span> <strong>60 – 120 Days</strong> (Pre-Opening)
              </div>
              <div class="text-[11px] text-slate-500">
                <span class="text-slate-400">Jurisdiction:</span> City Building Department
              </div>
            </div>

            <!-- COL 3: VENDOR PROCUREMENT SIGNALS -->
            <div class="space-y-1.5">
              <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Vendor Purchasing Signals</div>
              <div class="flex flex-wrap gap-1.5 pt-0.5">
                ${vendorBadges}
              </div>
            </div>

          </div>

          <!-- MUNICIPAL SCOPE EXCERPT -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-start space-x-2 text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
            <svg class="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <div class="leading-relaxed">
              <strong class="text-slate-700">Municipal Docket Scope:</strong>
              ${escapeHtml(lead.concept_snapshot || lead.work_description || 'Commercial interior alteration and equipment fit-out.')}
            </div>
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
    return `
      <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 text-xs">
        <td class="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-semibold">
          #${escapeHtml(lead.permit_number || '2026-MUNI')}
        </td>
        <td class="py-3.5 px-4">
          <div class="font-bold text-slate-900">${escapeHtml(lead.concept_name)}</div>
          <div class="text-[11px] text-slate-500">${escapeHtml(lead.street_address)}, ${lead.state}</div>
        </td>
        <td class="py-3.5 px-4">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            ${escapeHtml(lead.category || 'Commercial')}
          </span>
        </td>
        <td class="py-3.5 px-4 font-mono font-bold text-slate-800 text-[11px]">
          ${valText}
        </td>
        <td class="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
          ${escapeHtml(lead.filing_date || 'Active')}
        </td>
        <td class="py-3.5 px-4">
          <div class="font-semibold text-slate-800">${escapeHtml(lead.decision_maker_name || 'Managing Principal')}</div>
          <div class="font-mono text-[10px] text-amber-700 font-bold">${lead.display_phone}</div>
        </td>
        <td class="py-3.5 px-4 text-right">
          <button onclick="goToPersonalizedCheckout()" class="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition shadow-sm">
            Unlock ➔
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const tableHtml = `
    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-3 px-4">Docket #</th>
              <th class="py-3 px-4">Project Concept &amp; Address</th>
              <th class="py-3 px-4">Category</th>
              <th class="py-3 px-4">Valuation</th>
              <th class="py-3 px-4">Filing Date</th>
              <th class="py-3 px-4">Decision Maker</th>
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
  return `
    <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 rounded-3xl p-8 sm:p-10 text-center my-8 shadow-2xl relative overflow-hidden">
      <div class="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest mb-4">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Official Municipal Registry • Synchronized Daily at 6:00 AM UTC</span>
      </div>

      <h3 class="text-xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
        Viewing Top 10 of ${totalCount} Active Filings in ${selectedMetro}
      </h3>

      <p class="text-xs sm:text-sm text-slate-300 mb-6 max-w-xl mx-auto leading-relaxed">
        Our intelligence pipeline queries municipal building clerk databases every morning to detect new commercial buildouts within 24 hours of filing. Activate your 7-day trial for $1.00 to unlock direct cell phone numbers for all ${totalCount} projects and receive automated daily lead alerts.
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onclick="goToPersonalizedCheckout()" class="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm px-8 py-4 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center space-x-2">
          <span>Unlock All ${totalCount} Leads &amp; Daily Sync for $1.00</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
      </div>

      <div class="mt-4 flex items-center justify-center space-x-4 text-[11px] text-slate-400">
        <span class="flex items-center space-x-1">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Daily Automated Updates</span>
        </span>
        <span>•</span>
        <span class="flex items-center space-x-1">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>1 Rep Per Category Exclusivity</span>
        </span>
        <span>•</span>
        <span class="flex items-center space-x-1">
          <svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Cancel Anytime in 1 Click</span>
        </span>
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
