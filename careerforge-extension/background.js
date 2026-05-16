// background.js — Service Worker

// ── Get stored settings ──────────────────────────────────────────────────────
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['apiUrl', 'backendUrl', 'authToken', 'refreshToken', 'expiresAt', 'supabaseUrl', 'supabaseAnonKey'], (result) => {
      resolve({
        apiUrl: result.apiUrl || 'http://localhost:3000',
        backendUrl: result.backendUrl || 'http://localhost:8000',
        authToken: result.authToken || null,
        refreshToken: result.refreshToken || null,
        expiresAt: result.expiresAt || null,
        supabaseUrl: result.supabaseUrl || null,
        supabaseAnonKey: result.supabaseAnonKey || null,
      })
    })
  })
}

// ── Refresh access token ──────────────────────────────────────────────────────
async function refreshToken(settings) {
  if (!settings.refreshToken || !settings.supabaseUrl) return null

  try {
    const res = await fetch(`${settings.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': settings.supabaseAnonKey || '',
      },
      body: JSON.stringify({ refresh_token: settings.refreshToken }),
    })

    if (!res.ok) return null
    const data = await res.json()

    // Save new tokens
    chrome.storage.local.set({
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
  const settings = await getSettings()
  if (!settings.authToken) return null

  // Refresh if expiring in < 5 min
  if (settings.expiresAt && Date.now() > settings.expiresAt - 300000) {
    const newToken = await refreshToken(settings)
    return newToken || settings.authToken
  }

  return settings.authToken
}

// ── Save Job ─────────────────────────────────────────────────────────────────
async function saveJob(payload) {
  const settings = await getSettings()
  const token = await getValidToken()

  if (!token) {
    return { success: false, error: 'Not logged in. Open the extension and login first.' }
  }

  try {
    const response = await fetch(`${settings.backendUrl}/api/v1/jobs/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        company: payload.company,
        role: payload.role,
        status: payload.status || 'applied',
        priority: payload.priority || 'medium',
        job_type: payload.job_type || 'full-time',
        work_mode: payload.work_mode || 'remote',
        salary_min: payload.salary_min || null,
        salary_max: payload.salary_max || null,
        currency: payload.currency || 'USD',
        location: payload.location || null,
        job_url: payload.job_url || null,
        notes: payload.notes || null,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      // Token expired — try refresh
      if (response.status === 401) {
        const newToken = await refreshToken(settings)
        if (newToken) {
          // Retry with new token
          const retry = await fetch(`${settings.backendUrl}/api/v1/jobs/applications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },
            body: JSON.stringify(payload),
          })
          if (retry.ok) return { success: true, data: await retry.json() }
        }
        return { success: false, error: 'Session expired. Please login again.' }
      }
      return { success: false, error: `Error ${response.status}: ${errText}` }
    }

    const data = await response.json()
    return { success: true, data }

  } catch (err) {
    return { success: false, error: 'Network error: ' + err.message }
  }
}

// ── Message Handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveJob') {
    saveJob(message.payload).then(sendResponse)
    return true
  }

  if (message.action === 'setAuthToken') {
    chrome.storage.local.set({ authToken: message.token }, () => {
      sendResponse({ success: true })
    })
    return true
  }

  if (message.action === 'getValidToken') {
    getValidToken().then(token => sendResponse({ token }))
    return true
  }
})