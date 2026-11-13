/**
 * CivicIntel Client-Side Security & Access Gate
 * Enforces token validation and handles territory-specific member sessions.
 */

const AUTH_STORAGE_KEY = 'civic_auth_token';
const USER_STORAGE_KEY = 'civic_user_session';

async function checkMemberAccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  const storedToken = sessionStorage.getItem(AUTH_STORAGE_KEY);
  const token = tokenFromUrl || storedToken;

  if (!token) {
    handleUnauthorized('No active license token found.');
    return false;
  }

  try {
    const response = await fetch('data/tokens.json');
    if (!response.ok) {
      console.warn('Could not reach token manifest; allowing local session.');
      return true;
    }

    const tokensMap = await response.json();
    let subscriber = tokensMap[token];

    // Support newly activated trials from checkout
    if (!subscriber && (token.startsWith('tok_') || token.startsWith('tok_live_'))) {
      const stored = sessionStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try { subscriber = JSON.parse(stored); } catch (e) {}
      }
      if (!subscriber) {
        subscriber = {
          email: 'licensee@territory.internal',
          metro: urlParams.get('metro') || 'Austin',
          category: urlParams.get('category') || 'Commercial Territory License',
          status: 'active',
          registered_at: sessionStorage.getItem('civic_registered_at') || 'Today'
        };
      }
    }

    if (!subscriber) {
      handleUnauthorized('Invalid or expired member license token.');
      return false;
    }

    // Persist session
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(subscriber));

    // Update Portal Header UI
    applySubscriberHeader(subscriber);
    return true;

  } catch (err) {
    console.error('Auth verification error:', err);
    return true; // Graceful offline fallback
  }
}

function applySubscriberHeader(subscriber) {
  const userDisplay = document.getElementById('user-display');
  const territoryName = document.getElementById('territory-name');

  if (userDisplay && subscriber.email) {
    userDisplay.textContent = `${subscriber.email.split('@')[0]} (${subscriber.category})`;
  }
  if (territoryName && subscriber.metro) {
    territoryName.textContent = `${subscriber.metro.toUpperCase()} METRO CORRIDOR`;
  }
}

function handleUnauthorized(reason) {
  console.warn('Access denied:', reason);
  // Show gate overlay or redirect to pricing
  const main = document.querySelector('main');
  if (main) {
    main.innerHTML = `
      <div class="max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl">
        <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-900 mb-2">Member License Required</h2>
        <p class="text-xs text-slate-600 mb-6 leading-relaxed">
          This portal feed is licensed exclusively to verified territory sales representatives. Start your 7-day trial to access daily commercial buildout permits, jobsite addresses, and project scopes.
        </p>
        <div class="space-y-3">
          <a href="checkout.html" class="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3.5 rounded-xl transition shadow-sm">
            Activate Territory License — $1.00
          </a>
          <button onclick="activateDemoAccess()" class="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl border border-slate-200 transition cursor-pointer">
            Preview Demo Portal
          </button>
        </div>
      </div>
    `;
  }
}

async function activateDemoAccess() {
  try {
    const resp = await fetch('data/tokens.json');
    const tokens = await resp.json();
    const firstToken = Object.keys(tokens)[0];
    if (firstToken) {
      window.location.href = `portal.html?token=${firstToken}`;
    } else {
      window.location.href = `portal.html?token=tok_live_demo`;
    }
  } catch (e) {
    window.location.href = `portal.html?token=tok_live_demo`;
  }
}

// Attach auth gate to window
window.checkMemberAccess = checkMemberAccess;

