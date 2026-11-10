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

  // Update showcase heading
  const heading = document.getElementById('showcase-heading');
  const catLabel = selectedCategory === 'all' ? 'All Commercial Openings' : selectedCategory;
  if (heading) {
    heading.textContent = `Tailored Leads Preview: ${catLabel} in ${selectedMetro}`;
  }

  renderFilteredCards();
}

function renderFilteredCards() {
  const container = document.getElementById('leads-container');
  const rawList = allPreviews[selectedMetro] || [];

  // Filter based on user preferences
  const matched = rawList.filter(lead => {
    // Category match
    if (selectedCategory !== 'all' && lead.category !== selectedCategory) {
      return false;
    }
    // Valuation match
    if (selectedMinVal > 0 && (lead.estimated_valuation || 0) < selectedMinVal) {
      return false;
    }
    return true;
  });

  // Update matched count badge
  const countBadge = document.getElementById('matched-lead-count');
  if (countBadge) {
    countBadge.textContent = matched.length;
  }

  if (matched.length === 0) {
    container.innerHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center text-slate-400">
        <div class="text-3xl mb-2">🔍</div>
        <h4 class="text-base font-bold text-white mb-1">No Filings Matched This Exact Filter</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          We found filings in ${selectedMetro}, but none matching "${selectedCategory}" over $${selectedMinVal.toLocaleString()}. 
          Try selecting "All Commercial Openings" or switching cities above.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = matched.map((lead) => `
    <div class="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-6 transition-all duration-200 hover:shadow-xl">
      <!-- HEADER ROW -->
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div class="flex items-center space-x-2">
          <span class="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            ${escapeHtml(lead.category || 'Commercial Buildout')}
          </span>
          <span class="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full">
            ${escapeHtml(lead.metro)}, ${escapeHtml(lead.state)}
          </span>
          <span class="text-[11px] font-medium text-slate-500">
            Filed: ${lead.filing_date || 'Recent'}
          </span>
        </div>
        ${lead.estimated_valuation ? `
          <span class="mono text-xs font-bold text-teal-300 bg-teal-950/60 border border-teal-800 px-2.5 py-0.5 rounded-full">
            $${Number(lead.estimated_valuation).toLocaleString()} Valuation
          </span>
        ` : ''}
      </div>

      <!-- TITLE & ADDRESS -->
      <h3 class="text-lg font-bold text-white mb-1 leading-snug">
        ${escapeHtml(lead.concept_name)}
      </h3>
      <p class="text-xs text-slate-400 mb-4 flex items-center space-x-1.5">
        <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <span>${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}</span>
      </p>

      <!-- OWNER & MASKED PHONE ROW -->
      <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Decision Maker / Owner</div>
          <div class="text-sm font-semibold text-slate-200 mt-0.5">${escapeHtml(lead.decision_maker_name || 'Managing Principal')}</div>
        </div>

        <div class="flex items-center space-x-3">
          <div class="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
            <span class="text-xs font-mono font-bold text-amber-400">${lead.display_phone}</span>
          </div>
          <button onclick="goToPersonalizedCheckout()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center space-x-1 cursor-pointer">
            <span>Unlock Direct Mobile</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </button>
        </div>
      </div>

      <!-- AI SALES DOSSIER BOX -->
      <div class="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
        <div class="font-bold text-emerald-400 flex items-center space-x-1.5 mb-1">
          <span class="text-sm">🧠</span>
          <span>AI EXECUTIVE SALES DOSSIER</span>
        </div>
        <p><strong class="text-slate-400">Snapshot:</strong> ${escapeHtml(lead.concept_snapshot || '')}</p>
        <p><strong class="text-slate-400">Signals:</strong> ${escapeHtml(lead.buildout_signals || '')}</p>
        <p><strong class="text-slate-400">Pitch Angle:</strong> ${escapeHtml(lead.pitch_angle || '')}</p>
      </div>
    </div>
  `).join('');
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
