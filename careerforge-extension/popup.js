// popup.js — CareerForge Extension Popup

const DEFAULT_API_URL = 'http://localhost:3000'

// ── Storage Helpers ───────────────────────────────────────────────────────────
function getStorage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve))
}

async function getBackendUrl() {
  const s = await getStorage(['backendUrl'])
  return s.backendUrl || 'http://localhost:8000'
}

function setStorage(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve))
}

// ── Message Helpers ───────────────────────────────────────────────────────────
function showMsg(id, text, type = 'success') {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = text
  el.className = 'message ' + type
  el.style.display = 'block'
  if (type !== 'info') setTimeout(() => { el.style.display = 'none' }, 4000)
}

// ── Page Switch ───────────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.getElementById('page-' + pageId)?.classList.add('active')
}

// ── Get API URL ───────────────────────────────────────────────────────────────
async function getApiUrl() {
  const s = await getStorage(['apiUrl'])
  return s.apiUrl || DEFAULT_API_URL
}

// ── Login with Supabase via CareerForge API ───────────────────────────────────
async function loginWithEmail(email, password, apiUrl) {
  // Use Supabase auth endpoint directly
  const supabaseUrl = await getSupabaseUrl(apiUrl)
  if (!supabaseUrl) {
    throw new Error('Could not find Supabase URL. Check your CareerForge URL.')
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': await getSupabaseAnonKey(apiUrl),
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()

  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.msg || 'Invalid email or password')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: data.user,
    expiresAt: Date.now() + (data.expires_in * 1000),
  }
}

// ── Get Supabase config from CareerForge ──────────────────────────────────────
async function getSupabaseUrl(apiUrl) {
  try {
    // Try to get from env endpoint
    const res = await fetch(`${apiUrl}/api/auth/config`)
    if (res.ok) {
      const data = await res.json()
      return data.supabaseUrl
    }
  } catch { }

  // Fallback — read from storage
  const s = await getStorage(['supabaseUrl'])
  return s.supabaseUrl || null
}

async function getSupabaseAnonKey(apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/api/auth/config`)
    if (res.ok) {
      const data = await res.json()
      return data.supabaseAnonKey
    }
  } catch { }
  const s = await getStorage(['supabaseAnonKey'])
  return s.supabaseAnonKey || ''
}

// ── Refresh token ──────────────────────────────────────────────────────────────
async function refreshAccessToken() {
  const s = await getStorage(['refreshToken', 'apiUrl', 'supabaseUrl', 'supabaseAnonKey'])
  if (!s.refreshToken) return null

  try {
    const supabaseUrl = s.supabaseUrl
    const anonKey = s.supabaseAnonKey

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({ refresh_token: s.refreshToken }),
    })

    if (!res.ok) return null
    const data = await res.json()

    await setStorage({
      authToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    })

    return data.access_token
  } catch {
    return null
  }
}

// ── Get valid token ───────────────────────────────────────────────────────────
async function getValidToken() {
  const s = await getStorage(['authToken', 'expiresAt'])
  if (!s.authToken) return null

  // If token expires in < 5 min, refresh
  if (s.expiresAt && Date.now() > s.expiresAt - 300000) {
    const newToken = await refreshAccessToken()
    return newToken || s.authToken
  }

  return s.authToken
}

// ── Fetch stats ───────────────────────────────────────────────────────────────
async function fetchStats(token) {
  try {
    const backendUrl = await getBackendUrl()
    const res = await fetch(`${backendUrl}/api/v1/jobs/applications/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (res.ok) return await res.json()
  } catch { }
  return null
}

// ── Detect current tab platform ───────────────────────────────────────────────
async function detectPlatform() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.url) return null
    const url = tab.url
    if (url.includes('linkedin.com/jobs')) return 'linkedin'
    if (url.includes('indeed.com')) return 'indeed'
    if (url.includes('glassdoor.com')) return 'glassdoor'
  } catch { }
  return null
}

// ── Show Dashboard ────────────────────────────────────────────────────────────
async function showDashboard() {
  showPage('dashboard')

  const s = await getStorage(['userEmail', 'userName', 'apiUrl'])
  const apiUrl = s.apiUrl || DEFAULT_API_URL

  // User info
  const email = s.userEmail || ''
  const name = s.userName || email.split('@')[0] || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CF'

  document.getElementById('user-name').textContent = name
  document.getElementById('user-email').textContent = email
  document.getElementById('user-avatar').textContent = initials

  // Dashboard link
  document.getElementById('open-dashboard').href = apiUrl + '/dashboard'

  // Platform detection
  const platform = await detectPlatform()
  if (platform) {
    const el = document.getElementById('platform-' + platform)
    if (el) el.className = 'platform-tag active'
  }

  // Fetch stats
  const token = await getValidToken()
  if (token) {
    const stats = await fetchStats(token)
    if (stats) {
      document.getElementById('stat-total').textContent = stats.total || 0
      document.getElementById('stat-interviewing').textContent = stats.interviewing || 0
      document.getElementById('stat-offers').textContent = stats.offer || 0
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const s = await getStorage(['authToken', 'apiUrl'])
  const apiUrl = s.apiUrl || DEFAULT_API_URL

  // Fill URL inputs
  const urlInput = document.getElementById('login-api-url')
  if (urlInput) urlInput.value = apiUrl

  const backendInput = document.getElementById('login-backend-url')
  const backendStored = await getStorage(['backendUrl'])
  if (backendInput) backendInput.value = backendStored.backendUrl || 'http://localhost:8000'

  if (s.authToken) {
    // Check if token is still valid
    const token = await getValidToken()
    if (token) {
      await showDashboard()
      return
    }
  }

  // Show login
  showPage('login')
}

// ── Event Listeners ───────────────────────────────────────────────────────────

// Save Frontend URL
document.getElementById('save-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('login-api-url')?.value.trim() || DEFAULT_API_URL
  await setStorage({ apiUrl: url })
  showMsg('login-message', '✅ Frontend URL saved!', 'success')
})

// Save Backend URL
document.getElementById('save-backend-url-btn')?.addEventListener('click', async () => {
  const url = document.getElementById('login-backend-url')?.value.trim() || 'http://localhost:8000'
  await setStorage({ backendUrl: url })
  showMsg('login-message', '✅ Backend URL saved!', 'success')
})

// Login
document.getElementById('login-btn')?.addEventListener('click', async () => {
  const email = document.getElementById('login-email')?.value.trim()
  const password = document.getElementById('login-password')?.value
  const apiUrl = document.getElementById('login-api-url')?.value.trim() || DEFAULT_API_URL

  if (!email || !password) {
    showMsg('login-message', '❌ Please enter email and password', 'error')
    return
  }

  const btn = document.getElementById('login-btn')
  btn.disabled = true
  btn.textContent = 'Logging in...'
  showMsg('login-message', '⏳ Connecting to CareerForge...', 'info')

  try {
    // First save the URL
    await setStorage({ apiUrl })

    // Get Supabase config from CareerForge
    let supabaseUrl = null
    let supabaseAnonKey = null

    try {
      const configRes = await fetch(`${apiUrl}/api/auth/config`)
      if (configRes.ok) {
        const config = await configRes.json()
        supabaseUrl = config.supabaseUrl
        supabaseAnonKey = config.supabaseAnonKey
      }
    } catch { }

    // If config endpoint not available, ask user
    if (!supabaseUrl) {
      // Try from env vars that are public
      const envRes = await fetch(`${apiUrl}/_next/static/chunks/pages/_app.js`)
        .catch(() => null)

      // Fallback — use direct Supabase login with stored credentials
      const stored = await getStorage(['supabaseUrl', 'supabaseAnonKey'])
      supabaseUrl = stored.supabaseUrl
      supabaseAnonKey = stored.supabaseAnonKey

      if (!supabaseUrl) {
        throw new Error('Could not find Supabase config. Please set it manually in extension settings.')
      }
    }

    // Save Supabase config
    await setStorage({ supabaseUrl, supabaseAnonKey })

    // Login with Supabase
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok || data.error) {
      throw new Error(data.error_description || data.msg || 'Invalid email or password')
    }

    // Save session
    await setStorage({
      authToken: data.access_token,
      refreshToken: data.refresh_token,
      userEmail: data.user?.email || email,
      userName: data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'User',
      expiresAt: Date.now() + (data.expires_in * 1000),
      backendUrl: 'http://localhost:8000',
    })

    // Also notify background
    chrome.runtime.sendMessage({
      action: 'setAuthToken',
      token: data.access_token,
    })

    await showDashboard()

  } catch (err) {
    showMsg('login-message', '❌ ' + err.message, 'error')
    btn.disabled = false
    btn.textContent = '⚡ Login to CareerForge'
  }
})

// Enter key on password
document.getElementById('login-password')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('login-btn')?.click()
})

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await setStorage({
    authToken: null,
    refreshToken: null,
    userEmail: null,
    userName: null,
    expiresAt: null,
  })
  showPage('login')
})

// Open dashboard link
document.getElementById('open-dashboard')?.addEventListener('click', (e) => {
  e.preventDefault()
  const href = document.getElementById('open-dashboard')?.getAttribute('href')
  if (href && href !== '#') chrome.tabs.create({ url: href })
})

// ── Init ──────────────────────────────────────────────────────────────────────
init()