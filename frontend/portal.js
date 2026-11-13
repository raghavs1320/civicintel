/**
 * CivicIntel Member Intelligence Dashboard
 * Table-first rendering with expandable rows, interactive 1-click lead ticking/unticking,
 * connected vs. remaining pipeline tracking, 5-metric stats strip, CSV export, and search/filter.
 */

/* ─── State ───────────────────────────────────────────────────────────────── */
var allLeads           = [];
var activeCategory     = 'all';
var activeStatusFilter = 'all'; // 'all' | 'remaining' | 'connected'
var searchQuery        = '';
var filterCurrentMonth  = false;
var userMetro          = null;
var expandedRows       = {};

/* Pipeline: '' | 'contacted' | 'qualified' | 'closed' */
var pipelineData = (function () {
  try { return JSON.parse(localStorage.getItem('pipeline_data') || '{}'); }
  catch (e) { return {}; }
})();

/* Legacy compat: also read contacted_leads set */
var contactedLeads = (function () {
  try { return new Set(JSON.parse(localStorage.getItem('contacted_leads') || '[]')); }
  catch (e) { return new Set(); }
})();

/* ─── Helper: Is Lead Connected ───────────────────────────────────────────── */
function isLeadConnected(leadId) {
  return contactedLeads.has(leadId) || (pipelineData[leadId] && pipelineData[leadId] !== '');
}

/* ─── Boot ─────────────────────────────────────────────────────────────────── */
async function initPortal() {
  if (window.checkMemberAccess) {
    var hasAccess = await window.checkMemberAccess();
    if (!hasAccess) return;
  }

  var regDate  = localStorage.getItem('civic_registered_at') || sessionStorage.getItem('civic_registered_at') || 'Active License';
  var metaElem = document.getElementById('license-meta');
  if (metaElem && regDate) {
    metaElem.textContent = 'License active · ' + regDate;
  }

  var urlParams = new URLSearchParams(window.location.search);
  userMetro = urlParams.get('metro') || localStorage.getItem('custom_pref_metro') || sessionStorage.getItem('custom_pref_metro');

  /* Sync metro select to reflect session preference */
  var metroSelect = document.getElementById('portal-metro-switch');
  if (metroSelect && userMetro) {
    metroSelect.value = userMetro;
  }

  try {
    var response = await fetch('data/members_feed.json');
    if (!response.ok) throw new Error('Feed unavailable');
    var rawData = await response.json();

    if (userMetro && userMetro.toLowerCase() !== 'all') {
      var filtered = rawData.filter(function (l) {
        return l.metro && l.metro.toLowerCase() === userMetro.toLowerCase();
      });
      allLeads = filtered.length > 0 ? filtered : rawData;
    } else {
      allLeads = rawData;
    }

    var loading = document.getElementById('portal-loading');
    if (loading) loading.style.display = 'none';

    updateStats();
    updateCounts();
    renderFeed();
  } catch (err) {
    var loadingElem = document.getElementById('portal-loading');
    if (loadingElem) {
      loadingElem.textContent = 'Failed to load feed. Please refresh or contact your territory manager.';
    }
  }
}

/* ─── Header hydration ─────────────────────────────────────────────────────── */
function updatePortalHeader(session) {
  if (!session) return;
  var userDisplay = document.getElementById('user-display');
  var licenseMeta = document.getElementById('license-meta');

  if (userDisplay && session.email) {
    var domain   = session.email.indexOf('@') !== -1 ? session.email.split('@')[0] : session.email;
    var category = session.category || '';
    userDisplay.textContent = domain + (category ? ' (' + category + ')' : '');
  }
  if (licenseMeta) {
    var metro = session.metro || '';
    var parts = [];
    if (metro) parts.push(metro + ' territory');
    parts.push('active license');
    licenseMeta.textContent = parts.join(' · ');
  }
}

/* ─── Metro switch ─────────────────────────────────────────────────────────── */
function switchPortalMetro(newMetro) {
  userMetro = newMetro;
  localStorage.setItem('custom_pref_metro', newMetro);
  initPortal();
}

/* ─── Stats strip (5 metrics) ──────────────────────────────────────────────── */
function updateStats() {
  var total = allLeads.length;

  var connectedCount = 0;
  for (var i = 0; i < allLeads.length; i++) {
    if (isLeadConnected(allLeads[i].lead_id)) {
      connectedCount++;
    }
  }
  var remainingCount = total - connectedCount;

  var withVal = allLeads.filter(function (l) { return l.estimated_valuation; });
  var avgVal  = withVal.length
    ? withVal.reduce(function (sum, l) { return sum + Number(l.estimated_valuation); }, 0) / withVal.length
    : 0;

  /* Most recent filing date */
  var dates = allLeads
    .filter(function (l) { return l.filing_date && l.filing_date !== 'Recent'; })
    .map(function (l) { return l.filing_date; })
    .sort();
  var lastDate = dates.length ? dates[dates.length - 1] : '';

  var el;
  el = document.getElementById('stat-total');
  if (el) el.textContent = total;

  el = document.getElementById('stat-connected');
  if (el) el.textContent = connectedCount;

  el = document.getElementById('stat-remaining');
  if (el) el.textContent = remainingCount;

  el = document.getElementById('stat-avg');
  if (el) el.textContent = avgVal >= 1000000
    ? '$' + (avgVal / 1000000).toFixed(1) + 'M'
    : avgVal >= 1000
      ? '$' + Math.round(avgVal / 1000) + 'K'
      : avgVal ? '$' + Math.round(avgVal) : '—';

  el = document.getElementById('stat-updated');
  if (el) el.textContent = lastDate ? formatDateShort(lastDate) : '—';

  /* Status tab pill counters */
  var cntAll = document.getElementById('status-count-all');
  if (cntAll) cntAll.textContent = '(' + total + ')';

  var cntRem = document.getElementById('status-count-remaining');
  if (cntRem) cntRem.textContent = '(' + remainingCount + ')';

  var cntCon = document.getElementById('status-count-connected');
  if (cntCon) cntCon.textContent = '(' + connectedCount + ')';
}

/* ─── Filter pill counts ───────────────────────────────────────────────────── */
function updateCounts() {
  var el;

  el = document.getElementById('count-all');
  if (el) el.textContent = allLeads.length;

  el = document.getElementById('count-hosp');
  if (el) el.textContent = allLeads.filter(function (l) {
    return l.category === 'Hospitality & Dining';
  }).length;

  el = document.getElementById('count-health');
  if (el) el.textContent = allLeads.filter(function (l) {
    return l.category === 'Healthcare & Wellness';
  }).length;

  el = document.getElementById('count-retail');
  if (el) el.textContent = allLeads.filter(function (l) {
    return l.category === 'Retail & Commercial Buildout' || l.category === 'General Commercial';
  }).length;
}

/* ─── Filter: Status tabs (All vs Remaining vs Connected) ──────────────────── */
function setStatusFilter(status) {
  activeStatusFilter = status;
  var tabs = ['all', 'remaining', 'connected'];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var btn = document.getElementById('status-tab-' + t);
    if (btn) {
      if (t === status) {
        btn.className = 'status-tab mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition bg-slate-900 text-white border-slate-900';
      } else {
        btn.className = 'status-tab mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
      }
    }
  }
  renderFeed();
}

/* ─── Filter: category pill ────────────────────────────────────────────────── */
function setCategoryFilter(cat) {
  activeCategory = cat;
  document.querySelectorAll('.filter-pill').forEach(function (btn) {
    if (btn.getAttribute('data-cat') === cat) {
      btn.className = 'filter-pill mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition bg-slate-900 text-white border-slate-900';
    } else {
      btn.className = 'filter-pill mono text-xs font-semibold px-3 py-1.5 rounded-lg border transition bg-white hover:bg-slate-50 text-slate-700 border-slate-200';
    }
  });
  renderFeed();
}

/* ─── Filter: search ───────────────────────────────────────────────────────── */
function handleSearch() {
  var inp = document.getElementById('search-input');
  searchQuery = inp ? inp.value.toLowerCase().trim() : '';
  renderFeed();
}

/* ─── Filter: current month toggle ────────────────────────────────────────── */
function toggleCurrentMonth() {
  filterCurrentMonth = !filterCurrentMonth;
  var btn = document.getElementById('toggle-current-month');
  if (btn) {
    if (filterCurrentMonth) {
      btn.className = 'mono text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-700 bg-blue-700 text-white transition';
    } else {
      btn.className = 'mono text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition';
    }
  }
  renderFeed();
}

/* ─── 1-Click Interactive Tick / Untick ───────────────────────────────────── */
function toggleConnected(leadId, e) {
  if (e) {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  }

  if (isLeadConnected(leadId)) {
    // Untick -> Move to remaining
    contactedLeads.delete(leadId);
    delete pipelineData[leadId];
  } else {
    // Tick -> Move to connected
    contactedLeads.add(leadId);
    pipelineData[leadId] = 'contacted';
  }

  localStorage.setItem('contacted_leads', JSON.stringify(Array.from(contactedLeads)));
  localStorage.setItem('pipeline_data', JSON.stringify(pipelineData));

  updateStats();
  renderFeed();
}

/* ─── Pipeline Stage Selection ─────────────────────────────────────────────── */
function setPipelineStatus(leadId, status) {
  if (status === '') {
    delete pipelineData[leadId];
    contactedLeads.delete(leadId);
  } else {
    pipelineData[leadId] = status;
    contactedLeads.add(leadId);
  }
  localStorage.setItem('pipeline_data', JSON.stringify(pipelineData));
  localStorage.setItem('contacted_leads', JSON.stringify(Array.from(contactedLeads)));

  updateStats();
  renderFeed();
}

function getPipelineStatus(leadId) {
  if (pipelineData[leadId]) return pipelineData[leadId];
  if (contactedLeads.has(leadId)) return 'contacted';
  return '';
}

function renderPipelineBadge(leadId) {
  var status = getPipelineStatus(leadId);
  if (!status) {
    return '<span class="mono text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">New Lead</span>';
  }
  var map = {
    contacted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    qualified:  'bg-blue-50 text-blue-700 border-blue-200',
    closed:     'bg-amber-50 text-amber-700 border-amber-200'
  };
  var label = {
    contacted: 'Connected',
    qualified:  'Qualified',
    closed:     'Converted'
  };
  var cls = map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  return '<span class="mono text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-md ' + cls + '">' + (label[status] || status) + '</span>';
}

/* ─── Row expand / collapse ────────────────────────────────────────────────── */
function toggleRow(leadId) {
  expandedRows[leadId] = !expandedRows[leadId];
  var detailRow = document.getElementById('detail-' + leadId);
  var chevron   = document.getElementById('chev-'   + leadId);
  if (!detailRow) return;
  if (expandedRows[leadId]) {
    detailRow.style.display = '';
    if (chevron) chevron.classList.add('open');
  } else {
    detailRow.style.display = 'none';
    if (chevron) chevron.classList.remove('open');
  }
}

function getComparableDate(lead) {
  var d = lead.filing_date;
  if (!d || d === 'Recent') {
    return (lead.created_at && lead.created_at.slice(0, 10)) || '2099-12-31';
  }
  return String(d).trim();
}

/* ─── Main render ───────────────────────────────────────────────────────────── */
function renderFeed() {
  var container = document.getElementById('portal-feed');
  if (!container) return;

  var now = Date.now();
  var d14 = 14 * 24 * 60 * 60 * 1000;

  var d       = new Date();
  var yearMon = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

  var filtered = allLeads.filter(function (lead) {
    /* Status Filter: Remaining vs Connected */
    var connected = isLeadConnected(lead.lead_id);
    if (activeStatusFilter === 'connected' && !connected) return false;
    if (activeStatusFilter === 'remaining' && connected) return false;

    /* Current month filter */
    if (filterCurrentMonth) {
      if (!lead.filing_date || lead.filing_date === 'Recent') return false;
      if (!lead.filing_date.startsWith(yearMon)) return false;
    }

    /* Category / subtype */
    if (activeCategory !== 'all') {
      if (activeCategory === 'subtype_restaurant') {
        var t1 = ((lead.concept_name || '') + ' ' + (lead.concept_snapshot || '')).toLowerCase();
        if (!t1.match(/restaurant|grill|kitchen|dining|pizza|taco|bbq|steakhouse/)) return false;
      } else if (activeCategory === 'subtype_bar') {
        var t2 = ((lead.concept_name || '') + ' ' + (lead.concept_snapshot || '')).toLowerCase();
        if (!t2.match(/bar|pub|brew|lounge|cocktail|tavern|saloon|taproom/)) return false;
      } else if (activeCategory === 'subtype_cafe') {
        var t3 = ((lead.concept_name || '') + ' ' + (lead.concept_snapshot || '')).toLowerCase();
        if (!t3.match(/cafe|coffee|bakery|pastry|tea|boba|espresso/)) return false;
      } else if (activeCategory === 'Retail & Commercial Buildout') {
        if (lead.category !== 'Retail & Commercial Buildout' && lead.category !== 'General Commercial') return false;
      } else if (lead.category !== activeCategory) {
        return false;
      }
    }

    /* Search */
    if (searchQuery) {
      var hay = ((lead.concept_name || '') + ' ' + (lead.street_address || '') + ' ' + (lead.city || '') + ' ' + (lead.permit_number || '') + ' ' + (lead.contractor_name || '')).toLowerCase();
      if (hay.indexOf(searchQuery) === -1) return false;
    }

    return true;
  });

  /* Sort: newest filing date first ALWAYS */
  filtered.sort(function (a, b) {
    var da = getComparableDate(a);
    var db = getComparableDate(b);
    return db < da ? -1 : db > da ? 1 : 0;
  });

  /* Visible count */
  var vcElem = document.getElementById('visible-count');
  if (vcElem) vcElem.textContent = filtered.length;

  /* Empty state */
  var empty = document.getElementById('empty-state');
  if (filtered.length === 0) {
    container.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  /* Build rows */
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    html += buildRow(filtered[i], now, d14);
  }
  container.innerHTML = html;

  /* Re-apply expanded state without re-render */
  for (var id in expandedRows) {
    if (expandedRows[id]) {
      var dr = document.getElementById('detail-' + id);
      var ch = document.getElementById('chev-'   + id);
      if (dr) dr.style.display = '';
      if (ch) ch.classList.add('open');
    }
  }
}

function buildRow(lead, now, d14) {
  var connected  = isLeadConnected(lead.lead_id);
  var isNew      = (lead.filing_date === 'Recent') || (lead.filing_date && (now - new Date(lead.filing_date).getTime()) <= d14);
  var hasPhone   = lead.display_phone && lead.display_phone.indexOf('Pending') === -1 && lead.has_direct_phone;
  var budget     = lead.estimated_valuation ? '$' + Number(lead.estimated_valuation).toLocaleString() : '—';
  var shortDate  = lead.filing_date && lead.filing_date !== 'Recent' ? formatDateShort(lead.filing_date) : 'Recent';
  var catShort   = shortenCategory(lead.category || '');
  var pipeline   = renderPipelineBadge(lead.lead_id);
  var newBadge   = isNew ? '<span class="mono text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded ml-1.5">NEW</span>' : '';
  var scopeText  = escapeHtml(formatScopeText(lead));
  var pitchText  = lead.pitch_angle ? escapeHtml(lead.pitch_angle) : '';
  var status     = getPipelineStatus(lead.lead_id);

  /* Pipeline action buttons inside detail card */
  var pipelineActions = buildPipelineActions(lead.lead_id, status);

  /* Contact + action buttons */
  var actionBtns = '';
  if (hasPhone) {
    actionBtns += '<a href="tel:' + (lead.dial_phone || lead.display_phone) + '" class="inline-flex items-center gap-1.5 mono text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg transition">'
      + '<svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>'
      + escapeHtml(lead.display_phone)
      + '</a>';
  }
  if (lead.official_portal_url) {
    actionBtns += '<a href="' + escapeHtml(lead.official_portal_url) + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mono text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">'
      + '<svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>'
      + 'City Docket</a>';
  }
  /* Map link */
  var mapQuery = encodeURIComponent((lead.street_address || '') + ', ' + (lead.city || '') + ', ' + (lead.state || ''));
  actionBtns += '<a href="https://www.google.com/maps/search/?api=1&query=' + mapQuery + '" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mono text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg transition">'
    + '<svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
    + 'Map</a>';

  var detailDisplayStyle = (expandedRows[lead.lead_id]) ? '' : 'display:none';

  /* Tick / untick interactive square button */
  var tickBtn = '<button type="button" onclick="toggleConnected(\'' + lead.lead_id + '\', event)" '
    + 'title="' + (connected ? 'Connected (Click to untick)' : 'Click to tick as connected') + '" '
    + 'class="w-7 h-7 mx-auto rounded-lg flex items-center justify-center border transition cursor-pointer '
    + (connected ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' : 'bg-white border-slate-300 hover:border-blue-500 text-transparent') + '">'
    + '<svg class="w-4 h-4 ' + (connected ? 'block' : 'hidden') + '" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    + '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>'
    + '</svg>'
    + '</button>';

  return ''
    /* ── Main row ── */
    + '<tr class="lead-row border-b border-slate-100 hover:bg-slate-50/80 transition-colors" onclick="toggleRow(\'' + lead.lead_id + '\')">'
    +   '<td class="py-3 px-3 text-center" onclick="event.stopPropagation()">' + tickBtn + '</td>'
    +   '<td class="py-3 px-4 mono text-xs text-slate-500 whitespace-nowrap">' + shortDate + newBadge + '</td>'
    +   '<td class="py-3 px-4">'
    +     '<div class="font-semibold text-sm text-slate-900 leading-tight">' + escapeHtml(lead.concept_name || 'Commercial Buildout') + '</div>'
    +     '<div class="mono text-[11px] text-slate-400 mt-0.5">' + escapeHtml((lead.street_address || '') + (lead.city ? ', ' + lead.city : '')) + '</div>'
    +   '</td>'
    +   '<td class="py-3 px-4"><span class="mono text-[11px] text-slate-500">' + escapeHtml(catShort) + '</span></td>'
    +   '<td class="py-3 px-4 text-right mono text-xs font-semibold text-slate-700">' + budget + '</td>'
    +   '<td class="py-3 px-4">' + pipeline + '</td>'
    +   '<td class="py-3 px-4 text-right">'
    +     '<svg id="chev-' + lead.lead_id + '" class="chevron w-4 h-4 text-slate-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    +       '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>'
    +     '</svg>'
    +   '</td>'
    + '</tr>'

    /* ── Detail row ── */
    + '<tr id="detail-' + lead.lead_id + '" class="detail-row border-b border-slate-100" style="' + detailDisplayStyle + '">'
    +   '<td colspan="7" class="detail-content px-4 pb-5 pt-0">'
    +     '<div class="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-0 space-y-4">'

    /* Permit scope */
    +       '<div>'
    +         '<div class="mono text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Official Permit Scope</div>'
    +         '<div class="text-sm text-slate-700 leading-relaxed">' + scopeText + '</div>'
    +       '</div>'

    /* Sales intelligence */
    + (pitchText ? ''
    +       '<div class="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">'
    +         '<div class="mono text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Sales Intelligence</div>'
    +         '<div class="text-sm text-blue-900 leading-relaxed">' + pitchText + '</div>'
    +       '</div>'
    : '')

    /* Action buttons */
    +       '<div class="flex flex-wrap items-center gap-2">' + actionBtns + '</div>'

    /* Pipeline status */
    +       '<div>'
    +         '<div class="mono text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Detailed Pipeline Stage</div>'
    +         '<div class="flex flex-wrap gap-1.5">' + pipelineActions + '</div>'
    +       '</div>'

    +     '</div>'
    +   '</td>'
    + '</tr>';
}

function buildPipelineActions(leadId, currentStatus) {
  var stages = [
    { key: '',           label: 'Unticked (New)' },
    { key: 'contacted',  label: 'Connected'      },
    { key: 'qualified',  label: 'Qualified'      },
    { key: 'closed',     label: 'Converted'      }
  ];
  var html = '';
  for (var i = 0; i < stages.length; i++) {
    var s   = stages[i];
    var active = s.key === currentStatus;
    var cls;
    if (active) {
      if (s.key === '')               cls = 'bg-slate-200 text-slate-700 border-slate-300';
      else if (s.key === 'contacted') cls = 'bg-emerald-600 text-white border-emerald-600';
      else if (s.key === 'qualified') cls = 'bg-blue-700 text-white border-blue-700';
      else                            cls = 'bg-amber-500 text-white border-amber-500';
    } else {
      cls = 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
    }
    html += '<button onclick="event.stopPropagation();setPipelineStatus(\'' + leadId + '\',\'' + s.key + '\')" '
      + 'class="mono text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition ' + cls + '">'
      + s.label + '</button>';
  }
  return html;
}

/* ─── CSV Export ────────────────────────────────────────────────────────────── */
function exportFilteredCSV() {
  if (!allLeads || allLeads.length === 0) return;

  var headers = [
    'Permit #', 'Business Name', 'Category', 'Filed Date', 'Budget ($)',
    'Street Address', 'City', 'State', 'Zip', 'Metro',
    'Permit Scope', 'Pitch Angle', 'City Docket URL', 'Connected Status'
  ];

  var rows = [headers.join(',')];

  for (var i = 0; i < allLeads.length; i++) {
    var l         = allLeads[i];
    var connected = isLeadConnected(l.lead_id);
    var status    = getPipelineStatus(l.lead_id);
    rows.push([
      csvCell(l.permit_number),
      csvCell(l.concept_name),
      csvCell(l.category),
      csvCell(l.filing_date),
      csvCell(l.estimated_valuation),
      csvCell(l.street_address),
      csvCell(l.city),
      csvCell(l.state),
      csvCell(l.zip_code),
      csvCell(l.metro),
      csvCell(formatScopeText(l)),
      csvCell(l.pitch_angle),
      csvCell(l.official_portal_url),
      csvCell(connected ? (status ? status.toUpperCase() : 'CONNECTED') : 'REMAINING')
    ].join(','));
  }

  var blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.setAttribute('download', 'CivicIntel_Leads_' + (userMetro || 'All').replace(/\s/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvCell(val) {
  if (val === undefined || val === null) return '""';
  return '"' + String(val).replace(/"/g, '""') + '"';
}

/* ─── Formatting helpers ────────────────────────────────────────────────────── */
function formatDateShort(dateStr) {
  if (!dateStr || dateStr === 'Recent') return 'Recent';
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

function shortenCategory(cat) {
  var map = {
    'Hospitality & Dining':        'Hospitality',
    'Healthcare & Wellness':       'Healthcare',
    'Retail & Commercial Buildout':'Retail',
    'General Commercial':          'Commercial'
  };
  return map[cat] || cat;
}

function formatScopeText(lead) {
  var raw = '';
  if (lead.buildout_signals && lead.buildout_signals.length > 20) {
    raw = lead.buildout_signals;
  } else if (lead.concept_snapshot && lead.concept_snapshot.length > 10) {
    raw = lead.concept_snapshot;
  } else {
    raw = lead.concept_name || '';
  }

  var text = String(raw).trim();

  /* Strip administrative prefixes */
  text = text.replace(/^(ePlan:\s*)?(Commercial\s+)?Expedited\s+Review\s*[-\u2013:]\s*/i, '');
  text = text.replace(/^(QTEAM\s+INHOUSE|QTEAM|NSFAA|DSST|BU\s+ZO|MCR\s+W\/BATTERY|PEXP)[\s\-_/:.]*/i, '');
  text = text.replace(/^(THIS PROJECT CONSISTS OF A|SCOPE CONSISTS OF)\s+/i, '');
  text = text.replace(/\s+/g, ' ').trim();

  /* ALL CAPS conversion */
  if (text.length > 5 && text === text.toUpperCase()) {
    text = text.toLowerCase();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    text = text.replace(/([.!?]\s+)([a-z])/g, function (m, p1, p2) { return p1 + p2.toUpperCase(); });
    text = text.replace(/\b(sf|sqft|hvac|ada|pos|led|co|llc|inc|apt|bldg|tx|fl)\b/gi, function (m) { return m.toUpperCase(); });
  }

  if (text && !/[.!?]$/.test(text)) text += '.';

  return text || 'Commercial interior buildout and equipment installation.';
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/* Attach helpers to window */
window.toggleConnected   = toggleConnected;
window.setStatusFilter   = setStatusFilter;
window.setCategoryFilter = setCategoryFilter;
window.switchPortalMetro = switchPortalMetro;
window.exportFilteredCSV = exportFilteredCSV;
window.handleSearch      = handleSearch;
window.toggleCurrentMonth = toggleCurrentMonth;
window.toggleRow         = toggleRow;
window.setPipelineStatus = setPipelineStatus;

/* ─── Init ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initPortal);
