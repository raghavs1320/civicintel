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
    const subscriber = tokensMap[token];

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
      <div class="max-w-md mx-auto my-16 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20 text-2xl">
          🔒
        </div>
        <h2 class="text-xl font-bold text-white mb-2">Member License Required</h2>
        <p class="text-xs text-slate-400 mb-6 leading-relaxed">
          This portal feed is licensed exclusively to verified territory sales representatives. Start your 7-day trial to unlock full unmasked direct cell phone numbers.
        </p>
        <div class="space-y-3">
          <a href="index.html#pricing" class="block w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/20">
            Activate 7-Day Access for $1.00 ➔
          </a>
          <button onclick="activateDemoAccess()" class="block w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 transition">
            Test Demo License (Instant Access)
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

