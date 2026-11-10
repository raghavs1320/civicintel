/**
 * CivicIntel Interactive Customization & Showcase Logic
 * Allows prospective clients to customize their location, industry, and valuation,
 * instantly displaying matched leads and passing those preferences into checkout.
 */

let allPreviews = {};
let selectedMetro = 'Austin';
let selectedCategory = 'all';
let selectedMinVal = 0;

async function initShowcase() {
  try {
    const response = await fetch('data/previews.json');
    if (!response.ok) throw new Error('Failed to load preview data');
    allPreviews = await response.json();
    applyUserPreferences();
  } catch (error) {
    console.error('Error initializing showcase:', error);
    renderFallbackCards();
  }
}

function applyUserPreferences() {
  selectedMetro = document.getElementById('user-metro-input').value;
  selectedCategory = document.getElementById('user-category-input').value;
  selectedMinVal = Number(document.getElementById('user-valuation-input').value) || 0;

  // Sync city buttons
  document.querySelectorAll('.city-tab-btn').forEach(btn => {
    if (btn.dataset.metro === selectedMetro) {
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2 rounded-xl transition bg-slate-900 text-white shadow-sm";
    } else {
      btn.className = "city-tab-btn text-xs font-bold px-4 py-2 rounded-xl transition bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200";
    }
  });

  // Sync category buttons
  document.querySelectorAll('.cat-pill-btn').forEach(btn => {
    if (btn.dataset.category === selectedCategory) {
      btn.className = "cat-pill-btn text-xs font-bold px-3.5 py-1.5 rounded-lg transition bg-emerald-600 text-white shadow-sm";
    } else {
      btn.className = "cat-pill-btn text-xs font-bold px-3.5 py-1.5 rounded-lg transition bg-white hover:bg-slate-50 text-slate-600 border border-slate-200";
    }
  });

  // Update showcase heading
  const heading = document.getElementById('showcase-heading');
  const catLabel = selectedCategory === 'all' ? 'All Commercial Buildouts' : selectedCategory;
  if (heading) {
    heading.textContent = `Tailored Leads Preview: ${catLabel} in ${selectedMetro}`;
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

  // Filter based on user preferences
  const matched = rawList.filter(lead => {
    // Category match
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'Retail & Commercial Buildout') {
        if (lead.category !== 'Retail & Commercial Buildout' && lead.category !== 'General Commercial') {
          return false;
        }
      } else if (lead.category !== selectedCategory) {
        return false;
      }
    }
    // Valuation match
    if (selectedMinVal > 0 && (lead.estimated_valuation || 0) < selectedMinVal) {
      return false;
    }
    return true;
  });

  // Calculate pipeline valuation
  const totalValuation = matched.reduce((acc, lead) => acc + (lead.estimated_valuation || 0), 0);
  const valString = totalValuation > 0 ? ` ($${Math.round(totalValuation).toLocaleString()} Pipeline)` : '';

  // Update matched count badge & notification box
  const countBadge = document.getElementById('matched-lead-count');
  if (countBadge) {
    countBadge.textContent = matched.length;
  }
  const notifText = document.getElementById('filter-notif-text');
  if (notifText) {
    notifText.innerHTML = `Showing <strong class="text-slate-900 font-bold">${matched.length}</strong> active pre-opening projects${valString} in ${selectedMetro}.`;
  }

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-500 shadow-sm">
        <div class="w-10 h-10 mx-auto mb-3 text-slate-400 flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <h4 class="text-base font-bold text-slate-900 mb-1">No Filings Matched This Exact Filter</h4>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          We found filings in ${selectedMetro}, but none matching "${selectedCategory}" over $${selectedMinVal.toLocaleString()}. 
          Try selecting "All Commercial Openings" or switching cities above.
        </p>
      </div>
    `;
    return;
  }

  // Display top 30 leads for fast browser responsiveness
  const displayList = matched.slice(0, 30);

  const cardsHtml = displayList.map((lead) => `
    <div class="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md">
      <!-- HEADER ROW -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="flex items-center space-x-2">
          <span class="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            ${escapeHtml(lead.category || 'Commercial Buildout')}
          </span>
          <span class="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            ${escapeHtml(lead.metro)}, ${escapeHtml(lead.state)}
          </span>
          <span class="text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
            <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>Government Registered: ${lead.filing_date || 'Active Filing'}</span>
          </span>
        </div>
        ${lead.estimated_valuation ? `
          <span class="mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            $${Number(lead.estimated_valuation).toLocaleString()} Valuation
          </span>
        ` : ''}
      </div>

      <!-- TITLE & ADDRESS -->
      <h3 class="text-lg font-bold text-slate-900 mb-1 leading-snug">
        ${escapeHtml(lead.concept_name)}
      </h3>
      <p class="text-xs text-slate-500 mb-4 flex items-center space-x-1.5">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <span>${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}</span>
      </p>

      <!-- OWNER & MASKED PHONE ROW -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Decision Maker / Owner on Record</div>
          <div class="text-sm font-bold text-slate-800 mt-0.5">${escapeHtml(lead.decision_maker_name || 'Managing Principal')}</div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-2 shadow-sm">
            <span class="text-xs font-mono font-bold text-amber-700">${lead.display_phone}</span>
          </div>
          <button onclick="goToPersonalizedCheckout()" class="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-sm">
            <span>Unlock Direct Mobile</span>
            <svg class="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </button>
        </div>
      </div>

      <!-- PROJECT SCOPE BOX -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1">
        <div class="font-bold text-slate-500 uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span>PROJECT SCOPE &amp; PERMIT DETAILS</span>
        </div>
        <p class="text-slate-800">${escapeHtml(lead.concept_snapshot || lead.work_description || 'Commercial interior buildout and equipment installation.')}</p>
        ${lead.buildout_signals ? `<p class="text-slate-600 text-[11px]"><strong class="text-slate-700">Permit Scope:</strong> ${escapeHtml(lead.buildout_signals)}</p>` : ''}
      </div>
    </div>
  `).join('');

  // If more leads exist than the 30 previewed, show high-converting unlock banner
  const overflowNotice = matched.length > 30 ? `
    <div class="bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-200 rounded-2xl p-6 text-center my-6">
      <div class="font-extrabold text-sm text-slate-900 mb-1">
        Viewing Top 30 of ${matched.length} Verified Projects in ${selectedMetro}
      </div>
      <p class="text-xs text-slate-600 mb-4 max-w-lg mx-auto">
        Our master database tracks all ${matched.length} active commercial buildouts for this territory. Start your 7-day trial for $1.00 to unlock direct cell phone numbers for all ${matched.length} projects.
      </p>
      <button onclick="goToPersonalizedCheckout()" class="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-md">
        Unlock All ${matched.length} Leads for $1.00 ➔
      </button>
    </div>
  ` : '';

  container.innerHTML = cardsHtml + overflowNotice;
}

function goToPersonalizedCheckout() {
  const metro = document.getElementById('user-metro-input').value;
  const category = document.getElementById('user-category-input').value;
  const valuation = document.getElementById('user-valuation-input').value;

  // Persist selections for checkout and portal
  sessionStorage.setItem('custom_pref_metro', metro);
  sessionStorage.setItem('custom_pref_category', category);
  sessionStorage.setItem('custom_pref_valuation', valuation);

  window.location.href = `checkout.html?metro=${encodeURIComponent(metro)}&category=${encodeURIComponent(category)}`;
}

function renderFallbackCards() {
  const container = document.getElementById('leads-container');
  container.innerHTML = `
    <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
      <h3 class="text-lg font-bold text-white">Commercial Buildout Lead Preview</h3>
      <p class="text-xs text-slate-400 mb-4">Central Business District</p>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', initShowcase);
