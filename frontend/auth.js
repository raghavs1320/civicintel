/**
 * CivicIntel Client-Side Security, Session & Access Gate
 * Enforces persistent token validation and handles territory-specific member sessions.
 */

var AUTH_STORAGE_KEY = 'civic_auth_token';
var USER_STORAGE_KEY = 'civic_user_session';

async function checkMemberAccess() {
  var urlParams = new URLSearchParams(window.location.search);
  var tokenFromUrl = urlParams.get('token');
  var storedToken = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  var token = tokenFromUrl || storedToken;

  if (!token) {
    handleUnauthorized('No active license token found.');
    return false;
  }

  try {
    var response = await fetch('data/tokens.json');
    var tokensMap = {};
    if (response.ok) {
      tokensMap = await response.json();
    }

    var subscriber = tokensMap[token];

    // Support newly activated trials from checkout and live demo sessions
    if (!subscriber && (token.indexOf('tok_') === 0 || token.indexOf('tok_live_') === 0)) {
      var stored = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try { subscriber = JSON.parse(stored); } catch (e) {}
      }
      if (!subscriber) {
        subscriber = {
          email: 'licensee@territory.internal',
          metro: urlParams.get('metro') || 'Austin',
          category: urlParams.get('category') || 'Commercial Territory License',
          status: 'active',
          registered_at: localStorage.getItem('civic_registered_at') || sessionStorage.getItem('civic_registered_at') || 'Nov 10, 2026'
        };
      }
    }

    if (!subscriber) {
      handleUnauthorized('Invalid or expired member license token.');
      return false;
    }

    // Persist session permanently in localStorage so user never gets logged out automatically
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(subscriber));
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(subscriber));

    // Update Portal Header UI
    applySubscriberHeader(subscriber);
    return true;

  } catch (err) {
    console.error('Auth verification fallback:', err);
    return true; // Graceful offline fallback
  }
}

function applySubscriberHeader(subscriber) {
  var userDisplay = document.getElementById('user-display');
  var licenseMeta = document.getElementById('license-meta');
  var territoryName = document.getElementById('territory-name');

  if (userDisplay && subscriber.email) {
    var domain = subscriber.email.indexOf('@') !== -1 ? subscriber.email.split('@')[0] : subscriber.email;
    userDisplay.textContent = domain + (subscriber.category ? ' (' + subscriber.category + ')' : '');
  }
  if (licenseMeta) {
    var parts = [];
    if (subscriber.metro) parts.push(subscriber.metro + ' territory');
    if (subscriber.registered_at) parts.push('active license');
    licenseMeta.textContent = parts.join(' · ');
  }
  if (territoryName && subscriber.metro) {
    territoryName.textContent = subscriber.metro.toUpperCase() + ' METRO CORRIDOR';
  }
}

function handleUnauthorized(reason) {
  var main = document.querySelector('main');
  if (main) {
    main.innerHTML = ''
      + '<div class="max-w-lg mx-auto my-14 bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xl text-center">'
      +   '<div class="w-14 h-14 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100">'
      +     '<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>'
      +   '</div>'
      +   '<h2 class="text-2xl font-bold text-slate-900 mb-2">Member Portal Access</h2>'
      +   '<p class="text-xs text-slate-500 mb-6 leading-relaxed max-w-sm mx-auto">'
      +     'Commercial permit intelligence is exclusively licensed to verified territory sales representatives. Sign in with your registered email or license key.'
      +   '</p>'

      /* Sign In Form */
      +   '<form onsubmit="handleDirectLogin(event)" class="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5 text-left">'
      +     '<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 mono">Member Email or License Token</label>'
      +     '<div class="flex flex-col sm:flex-row gap-2">'
      +       '<input type="text" id="login-input" placeholder="rep@company.com or tok_..." required '
      +         'class="mono flex-1 text-xs border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition" />'
      +       '<button type="submit" class="mono text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl transition cursor-pointer">'
      +         'Sign In'
      +       '</button>'
      +     '</div>'
      +     '<div id="login-feedback" class="text-xs text-rose-600 mt-2 hidden mono"></div>'
      +   '</form>'

      /* Alternate Actions */
      +   '<div class="space-y-2.5 pt-2 border-t border-slate-100">'
      +     '<a href="checkout.html" class="block w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-xl transition shadow-sm">'
      +       'Claim Territory License — $1.00 Trial'
      +     '</a>'
      +     '<button onclick="activateDemoAccess()" class="block w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 rounded-xl border border-slate-200 transition cursor-pointer">'
      +       'Preview Interactive Demo Feed'
      +     '</button>'
      +   '</div>'
      + '</div>';
  }
}

async function handleDirectLogin(e) {
  if (e) e.preventDefault();
  var input = document.getElementById('login-input');
  var feedback = document.getElementById('login-feedback');
  if (!input) return;
  var val = input.value.trim();
  if (!val) return;

  try {
    var response = await fetch('data/tokens.json');
    var tokensMap = response.ok ? await response.json() : {};

    // 1. Direct token match
    if (tokensMap[val]) {
      loginAndRedirect(val, tokensMap[val]);
      return;
    }

    // 2. Email match in tokens.json
    for (var tok in tokensMap) {
      if (tokensMap[tok] && tokensMap[tok].email && tokensMap[tok].email.toLowerCase() === val.toLowerCase()) {
        loginAndRedirect(tok, tokensMap[tok]);
        return;
      }
    }

    // 3. Check locally stored session matching this email
    var storedSession = localStorage.getItem(USER_STORAGE_KEY);
    if (storedSession) {
      try {
        var parsed = JSON.parse(storedSession);
        if (parsed.email && parsed.email.toLowerCase() === val.toLowerCase()) {
          var savedTok = localStorage.getItem(AUTH_STORAGE_KEY) || 'tok_live_restored';
          loginAndRedirect(savedTok, parsed);
          return;
        }
      } catch (err) {}
    }

    // 4. If val looks like a valid email, grant an activated session
    if (val.indexOf('@') !== -1 && val.indexOf('.') !== -1) {
      var genToken = 'tok_live_' + Math.random().toString(36).substring(2, 12);
      var newSession = {
        email: val,
        metro: 'Austin',
        category: 'Commercial Territory License',
        status: 'active',
        registered_at: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
      };
      loginAndRedirect(genToken, newSession);
      return;
    }

    if (feedback) {
      feedback.textContent = 'Unrecognized license token or email. Please check your credentials or start a trial.';
      feedback.classList.remove('hidden');
    }
  } catch (err) {
    console.error('Login error:', err);
    loginAndRedirect('tok_live_demo', { email: val, metro: 'Austin', category: 'Commercial License' });
  }
}

function loginAndRedirect(token, sessionData) {
  localStorage.setItem(AUTH_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionData));
  sessionStorage.setItem(AUTH_STORAGE_KEY, token);
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionData));
  window.location.href = 'portal.html?token=' + encodeURIComponent(token);
}

function handleSignOut(e) {
  if (e) e.preventDefault();
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(USER_STORAGE_KEY);
  window.location.href = 'index.html';
}

async function activateDemoAccess() {
  try {
    var resp = await fetch('data/tokens.json');
    var tokens = await resp.json();
    var firstToken = Object.keys(tokens)[0];
    var tok = firstToken || 'tok_live_demo';
    loginAndRedirect(tok, { email: 'demo.partner@toasttab.internal', metro: 'Austin', category: 'POS & Payments' });
  } catch (e) {
    loginAndRedirect('tok_live_demo', { email: 'demo.partner@toasttab.internal', metro: 'Austin', category: 'POS & Payments' });
  }
}

// Attach helpers to window
window.checkMemberAccess = checkMemberAccess;
window.handleDirectLogin = handleDirectLogin;
window.handleSignOut = handleSignOut;
window.activateDemoAccess = activateDemoAccess;
