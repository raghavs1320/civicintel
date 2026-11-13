/**
 * CivicIntel Member Dashboard Logic
 * Powers live unmasked intelligence, search, filtering, and local pipeline tracking.
 */

let allLeads = [];
let activeCategory = 'all';
let searchQuery = '';
let filterCurrentMonth = false;
let userMetro = null;

// Pipeline status tracked locally in browser storage
let contactedLeads = new Set(JSON.parse(localStorage.getItem('contacted_leads') || '[]'));

async function initPortal() {
  if (window.checkMemberAccess) {
    const hasAccess = await window.checkMemberAccess();
    if (!hasAccess) return;
  }

  // Display user registration date & license status
  const regDate = sessionStorage.getItem('civic_registered_at') || 'Nov 10, 2026';
  const metaElem = document.getElementById('license-meta');
  if (metaElem) {
    metaElem.textContent = `Category Lock: Active • Registered: ${regDate}`;
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
  document.getElementById('count-retail').textContent = allLeads.filter(l => l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial').length;
}

function setCategoryFilter(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-pill').forEach(btn => {
    if (btn.getAttribute('data-cat') === cat) {
      btn.className = 'filter-pill whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition bg-emerald-600 text-white shadow-sm';
    } else {
      btn.className = 'filter-pill whitespace-nowrap text-xs font-bold px-4 py-2 rounded-xl transition bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm';
    }
  });
  renderFeed();
}

function handleSearch() {
  searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  renderFeed();
}

function toggleCurrentMonth() {
  filterCurrentMonth = document.getElementById('toggle-current-month').checked;
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

function formatDate(dateStr) {
  if (!dateStr || dateStr === 'Recent') return 'Recent Filing';
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

function exportFilteredCSV() {
  if (!allLeads || allLeads.length === 0) return;

  const headers = ['Permit #', 'Project / Business Name', 'Category', 'Filing Date', 'Budget ($)', 'Street Address', 'City', 'State', 'Zip Code', 'Contractor of Record', 'Contractor Phone', 'Official Scope', 'City Docket Link', 'Pipeline Status'];
  const rows = [headers.join(',')];

  allLeads.forEach(l => {
    rows.push([
      `"${(l.permit_number || '').replace(/"/g, '""')}"`,
      `"${(l.concept_name || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`,
      `"${(l.filing_date || '').replace(/"/g, '""')}"`,
      `"${l.estimated_valuation || ''}"`,
      `"${(l.street_address || '').replace(/"/g, '""')}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${(l.state || '').replace(/"/g, '""')}"`,
      `"${(l.zip_code || '').replace(/"/g, '""')}"`,
      `"${(l.contractor_name || l.owner_raw || '').replace(/"/g, '""')}"`,
      `"${(l.has_direct_phone ? l.display_phone : '').replace(/"/g, '""')}"`,
      `"${(formatScopeText(l)).replace(/"/g, '""')}"`,
      `"${(l.official_portal_url || '').replace(/"/g, '""')}"`,
      `"${contactedLeads.has(l.lead_id) ? 'Contacted' : 'New'}"`
    ].join(','));
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `CivicIntel_Leads_${userMetro || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderFeed() {
  const container = document.getElementById('portal-feed');

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const filtered = allLeads.filter(lead => {
    // 0. Current Month filter
    if (filterCurrentMonth) {
      if (!lead.filing_date || (!lead.filing_date.startsWith('2026-11') && !lead.filing_date.startsWith(currentYearMonth))) {
        return false;
      }
    }

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
      } else if (activeCategory === 'Retail & Commercial Buildout') {
        if (lead.category !== 'Retail & Commercial Buildout' && lead.category !== 'General Commercial') return false;
      } else if (lead.category !== activeCategory) {
        return false;
      }
    }

    // 2. Search query check
    if (searchQuery) {
      const haystack = `${lead.concept_name} ${lead.street_address} ${lead.city} ${lead.contractor_name || ''} ${lead.permit_number || ''}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }

    return true;
  });

  // Sort: NEWEST FILINGS FIRST ALWAYS
  filtered.sort((a, b) => {
    const dateA = a.filing_date && a.filing_date !== 'Recent' ? a.filing_date : '0000-00-00';
    const dateB = b.filing_date && b.filing_date !== 'Recent' ? b.filing_date : '0000-00-00';
    return dateB.localeCompare(dateA);
  });

  document.getElementById('visible-count').textContent = filtered.length;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
        No active leads match your search criteria. Clear your search or change categories.
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(lead => {
    const isContacted = contactedLeads.has(lead.lead_id);
    const hasPhone = lead.display_phone && !lead.display_phone.includes('Pending');
    const formattedDate = formatDate(lead.filing_date);
    const contactName = getCleanContactName(lead);

    return `
      <div class="bg-white border ${isContacted ? 'border-emerald-300 bg-emerald-50/10' : 'border-slate-200'} hover:border-slate-300 rounded-xl p-5 sm:p-6 transition shadow-xs hover:shadow-sm">
        
        <!-- Header Metadata Row -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 text-xs">
          <div class="flex items-center space-x-2 flex-wrap text-slate-500">
            <span class="font-mono text-slate-400">#${escapeHtml(lead.permit_number || '2026-MUNI')}</span>
            <span class="text-slate-300">•</span>
            <span class="font-medium text-slate-700">${escapeHtml(lead.category)}</span>
            <span class="text-slate-300">•</span>
            <span>${escapeHtml(lead.metro)}, ${escapeHtml(lead.state)}</span>
            <span class="text-slate-300">•</span>
            <span>Filed ${escapeHtml(formattedDate)}</span>
          </div>

          <div class="flex items-center space-x-2">
            ${lead.estimated_valuation ? `
              <span class="font-mono font-bold text-slate-900 text-xs">
                $${Number(lead.estimated_valuation).toLocaleString()}
              </span>
            ` : `
              <span class="text-slate-400 text-xs font-medium">Commercial Finish-Out</span>
            `}
            <button 
              onclick="toggleContacted('${lead.lead_id}')" 
              class="text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                isContacted 
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold' 
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }">
              <span>${isContacted ? '✓ Contacted' : '○ Mark Contacted'}</span>
            </button>
          </div>
        </div>

        <!-- Concept Name & Address -->
        <div class="mb-3">
          <h3 class="text-base font-bold text-slate-900 leading-snug">
            ${escapeHtml(lead.concept_name)}
          </h3>
          <div class="flex items-center text-xs text-slate-500 mt-1 space-x-1">
            <a 
              href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.street_address + ', ' + lead.city + ', ' + lead.state)}" 
              target="_blank" 
              class="hover:text-emerald-700 transition underline underline-offset-2">
              ${escapeHtml(lead.street_address)}, ${escapeHtml(lead.city)}, ${lead.state} ${lead.zip_code || ''} ↗
            </a>
          </div>
        </div>

        <!-- Contractor & Municipal Record Bar -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Filing / Contractor Entity</div>
            <div class="text-sm font-bold text-slate-900 mt-0.5">
              <span>${escapeHtml(lead.contractor_name || lead.owner_raw || 'Commercial Remodel Permit on File')}</span>
            </div>
            ${lead.registered_address ? `
              <div class="text-[11px] text-slate-500 mt-0.5">${escapeHtml(lead.registered_address)}</div>
            ` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-2">
            ${hasPhone ? `
              <a 
                href="tel:${lead.dial_phone || lead.display_phone}" 
                class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center space-x-1.5 shadow-xs">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                <span>Call Contractor: ${escapeHtml(lead.display_phone)}</span>
              </a>
            ` : ''}

            ${lead.official_portal_url ? `
              <a 
                href="${escapeHtml(lead.official_portal_url)}" 
                target="_blank" 
                class="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3 py-2 rounded-lg border border-slate-200 transition shadow-xs flex items-center space-x-1">
                <span>City Hall Docket ↗</span>
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Municipal Scope (Official Public Record) -->
        <div class="text-xs text-slate-700 leading-relaxed bg-slate-50/70 border border-slate-100 rounded-xl p-3">
          <span class="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">Official Permit Scope</span>
          ${escapeHtml(formatScopeText(lead))}
        </div>

      </div>
    `;
  }).join('');
}

function formatScopeText(lead) {
  let raw = lead.concept_name || lead.concept_snapshot || lead.work_description || '';
  let text = String(raw).trim();

  // Remove administrative tracking prefixes
  text = text.replace(/^(ePlan:\s*)?(Commercial\s+)?Expedited\s+Review\s*[-–:]\s*/i, '');
  text = text.replace(/^(QTEAM\s+INHOUSE|QTEAM|NSFAA|DSST|BU\s+ZO|MCR\s+W\/BATTERY|PEXP)[\s\-_/:]*/i, '');
  text = text.replace(/^(THIS PROJECT CONSISTS OF A|SCOPE CONSISTS OF)\s+/i, '');
  text = text.replace(/\s+/g, ' ').trim();

  // If ALL CAPS, convert to clean sentence case preserving all words
  if (text.length > 5 && text === text.toUpperCase()) {
    text = text.toLowerCase();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/([.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    text = text.replace(/\b(sf|sqft|hvac|ada|pos|led|co|llc|inc|apt|bldg)\b/gi, m => m.toUpperCase());
  }

  if (text && !/[.!?]$/.test(text)) {
    text += '.';
  }

  return text || 'Commercial interior buildout and equipment installation.';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', initPortal);

