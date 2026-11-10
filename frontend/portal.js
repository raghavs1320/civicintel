/**
 * CivicIntel Member Dashboard Logic
 * Powers live unmasked intelligence, search, filtering, and local pipeline tracking.
 */

let allLeads = [];
let activeCategory = 'all';
let searchQuery = '';
let filterPhonesOnly = false;
let userMetro = null;

// Pipeline status tracked locally in browser storage
let contactedLeads = new Set(JSON.parse(localStorage.getItem('contacted_leads') || '[]'));

async function initPortal() {
  if (window.checkMemberAccess) {
    const hasAccess = await window.checkMemberAccess();
    if (!hasAccess) return;
  }

  // Read metro preference from URL or session
  const urlParams = new URLSearchParams(window.location.search);
  userMetro = urlParams.get('metro') || sessionStorage.getItem('custom_pref_metro');

  try {
    const response = await fetch('data/members_feed.json');
    if (!response.ok) throw new Error('Failed to load member feed');
    const rawData = await response.json();
    
    // Filter to user's assigned metro if specified
    if (userMetro && userMetro.toLowerCase() !== 'all') {
      allLeads = rawData.filter(l => l.metro && l.metro.toLowerCase() === userMetro.toLowerCase());
      if (allLeads.length === 0) allLeads = rawData; // Fallback to all if zero matches
    } else {
      allLeads = rawData;
    }

    updateCounts();
    renderFeed();
  } catch (err) {
    console.error('Portal init error:', err);
    document.getElementById('portal-feed').innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        Failed to load feed. Please refresh or contact your territory manager.
      </div>
    `;
  }
}

function switchPortalMetro(newMetro) {
  userMetro = newMetro;
  const selectElem = document.getElementById('portal-metro-switch');
  if (selectElem) selectElem.value = newMetro;
  initPortal();
}

function updateCounts() {
  document.getElementById('count-all').textContent = allLeads.length;
  document.getElementById('count-hosp').textContent = allLeads.filter(l => l.category === 'Hospitality & Dining').length;
  document.getElementById('count-health').textContent = allLeads.filter(l => l.category === 'Healthcare & Wellness').length;
  document.getElementById('count-retail').textContent = allLeads.filter(l => l.category === 'Retail & Commercial Buildout').length;
}

function setCategoryFilter(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-cat') === cat) {
      btn.className = 'filter-pill whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition bg-emerald-500 text-slate-950';
    } else {
      btn.className = 'filter-pill whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800';
    }
  });
  renderFeed();
}

function handleSearch() {
  searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  renderFeed();
}

function togglePhonesOnly() {
  filterPhonesOnly = document.getElementById('toggle-phones-only').checked;
  renderFeed();
}

function toggleContacted(leadId) {
  if (contactedLeads.has(leadId)) {
    contactedLeads.delete(leadId);
  } else {
    contactedLeads.add(leadId);
  }
  localStorage.setItem('contacted_leads', JSON.stringify([...contactedLeads]));
  renderFeed();
}

function renderFeed() {
  const container = document.getElementById('portal-feed');

  const filtered = allLeads.filter(lead => {
    // 1. Category and Subtype check
    if (activeCategory !== 'all') {
      if (activeCategory === 'subtype_restaurant') {
        const text = `${lead.concept_name} ${lead.work_description} ${lead.concept_snapshot}`.toLowerCase();
        if (!text.includes('restaurant') && !text.includes('grill') && !text.includes('kitchen') && !text.includes('dining') && !text.includes('pizza') && !text.includes('taco')) return false;
      } else if (activeCategory === 'subtype_bar') {
        const text = `${lead.concept_name} ${lead.work_description} ${lead.concept_snapshot}`.toLowerCase();
        if (!text.includes('bar') && !text.includes('pub') && !text.includes('brew') && !text.includes('lounge') && !text.includes('cocktail') && !text.includes('tavern')) return false;
      } else if (activeCategory === 'subtype_cafe') {
        const text = `${lead.concept_name} ${lead.work_description} ${lead.concept_snapshot}`.toLowerCase();
        if (!text.includes('cafe') && !text.includes('coffee') && !text.includes('bakery') && !text.includes('pastry') && !text.includes('tea') && !text.includes('boba')) return false;
      } else if (lead.category !== activeCategory) {
        return false;
      }
    }

    // 2. Direct phone filter
    if (filterPhonesOnly && !lead.has_direct_phone) return false;

    // 3. Search query check
    if (searchQuery) {
      const haystack = `${lead.concept_name} ${lead.street_address} ${lead.city} ${lead.decision_maker_name}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }

    return true;
  });

  document.getElementById('visible-count').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        No active leads match your search criteria. Clear your search or change categories.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(lead => {
    const isContacted = contactedLeads.has(lead.lead_id);
    const hasPhone = lead.display_phone && !lead.display_phone.includes('Pending');

    return `
      <div class="bg-slate-900/80 border ${isContacted ? 'border-emerald-900/50 bg-slate-950/60' : 'border-slate-800/90'} hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition shadow-lg">
        
        <!-- HEADER BADGES ROW -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex items-center space-x-2">
            <span class="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              ${escapeHtml(lead.category)}
            </span>
            <span class="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full">
              ${escapeHtml(lead.metro)}, ${escapeHtml(lead.state)}
            </span>
            <span class="text-[11px] font-medium text-slate-500">
              Filed: ${lead.filing_date || 'Recent'}
            </span>
          </div>

          <!-- VALUATION & STATUS -->
          <div class="flex items-center space-x-2">
            ${lead.estimated_valuation ? `
              <span class="mono text-xs font-bold text-teal-300 bg-teal-950/60 border border-teal-800 px-2.5 py-0.5 rounded-full">
                $${Number(lead.estimated_valuation).toLocaleString()}
              </span>
            ` : ''}
            <button 
              onclick="toggleContacted('${lead.lead_id}')" 
              class="text-xs px-2.5 py-0.5 rounded-full border transition flex items-center space-x-1 ${
                isContacted 
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800 font-bold' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }">
              <span>${isContacted ? '✓ Contacted' : '○ Mark Contacted'}</span>
            </button>
          </div>
        </div>

        <!-- TITLE & ADDRESS -->
        <h3 class="text-lg font-bold text-white mb-1.5 leading-snug">
          ${escapeHtml(lead.concept_name)}
        </h3>

        <div class="flex items-center text-xs text-slate-400 mb-4 space-x-2">
          <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <a 
            href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.street_address + ', ' + lead.city + ', ' + lead.state)}" 
            target="_blank" 
            class="hover:text-emerald-400 transition underline underline-offset-2">
            ${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''}
          </a>
        </div>

        <!-- DECISION MAKER & ACTION BUTTONS -->
        <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Decision Maker / Owner</div>
            <div class="text-sm font-bold text-white mt-0.5 flex items-center space-x-2">
              <span>${escapeHtml(lead.decision_maker_name || 'Owner on Record')}</span>
              <span class="text-[10px] text-slate-400 font-normal">(${escapeHtml(lead.decision_maker_title || 'Managing Principal')})</span>
            </div>
            ${lead.registered_address ? `
              <div class="text-[11px] text-slate-500 mt-0.5">Reg. Office: ${escapeHtml(lead.registered_address)}</div>
            ` : ''}
          </div>

          <!-- PRIMARY ACTION BUTTONS -->
          <div class="flex flex-wrap items-center gap-2">
            ${hasPhone ? `
              <a 
                href="tel:${lead.dial_phone || lead.display_phone}" 
                class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-lg transition flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>Call ${escapeHtml(lead.display_phone)}</span>
              </a>
            ` : `
              <span class="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                Direct Line Pending
              </span>
            `}

            <a 
              href="${escapeHtml(lead.linkedin_url)}" 
              target="_blank" 
              class="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-lg border border-slate-700 transition flex items-center space-x-1.5">
              <span>LinkedIn</span>
              <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>

            ${lead.official_portal_url ? `
              <a 
                href="${escapeHtml(lead.official_portal_url)}" 
                target="_blank" 
                class="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs px-3 py-2.5 rounded-lg border border-slate-800 transition">
                City Docket ➔
              </a>
            ` : ''}
          </div>
        </div>

        <!-- FACTUAL PROJECT SCOPE & PERMIT DETAILS -->
        <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-300 space-y-1">
          <div class="font-bold text-slate-400 uppercase text-[10px] tracking-wider mb-1 flex items-center space-x-1.5">
            <span>📋</span>
            <span>PROJECT SCOPE &amp; PERMIT DETAILS</span>
          </div>
          <p class="text-slate-200">${escapeHtml(lead.concept_snapshot || lead.work_description || 'Commercial interior buildout and equipment installation.')}</p>
          ${lead.buildout_signals ? `<p class="text-slate-400 text-[11px]"><strong class="text-slate-300">Permit Scope:</strong> ${escapeHtml(lead.buildout_signals)}</p>` : ''}
        </div>

      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', initPortal);

