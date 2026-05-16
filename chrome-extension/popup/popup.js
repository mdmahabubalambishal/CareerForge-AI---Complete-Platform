const API_URL = 'http://localhost:8000'
const SUPABASE_URL = 'https://ubeibiqjmjghnhnnxqvs.supabase.co'     
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZWliaXFqbWpnaG5obm54cXZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzAwNzUsImV4cCI6MjA5MzMwNjA3NX0.QFfupKgdjmpOwQLVI_YqvI1RwOeEHpSCPmCNlBdo-3E'          

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['authToken'], result => {
      resolve(result.authToken || null)
    })
  })
}

async function getCurrentJob() {
  return new Promise(resolve => {
    chrome.storage.local.get(['currentJob'], result => {
      resolve(result.currentJob || null)
    })
  })
}

function showStatus(msg, type = 'loading') {
  const box = document.getElementById('status-box')
  box.textContent = msg
  box.className = `status show ${type}`
}

function hideStatus() {
  document.getElementById('status-box').className = 'status'
}

function showResult(label, content) {
  document.getElementById('result-label').textContent = label
  document.getElementById('result-content').textContent = content
  document.getElementById('result-box').className = 'result-box show'
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const token = await getToken()

  if (!token) {
    document.getElementById('login-section').style.display = 'block'
    document.getElementById('main-section').style.display = 'none'
    document.getElementById('no-job-section').style.display = 'none'
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isLinkedIn = tab?.url?.includes('linkedin.com/jobs')

  if (!isLinkedIn) {
    document.getElementById('login-section').style.display = 'none'
    document.getElementById('main-section').style.display = 'none'
    document.getElementById('no-job-section').style.display = 'block'
    return
  }

  document.getElementById('login-section').style.display = 'none'
  document.getElementById('no-job-section').style.display = 'none'
  document.getElementById('main-section').style.display = 'block'

  try {
    const jobInfo = await new Promise(resolve => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_JOB_INFO' }, response => {
        resolve(response || null)
      })
    })

    if (jobInfo?.title) {
      document.getElementById('job-title').textContent = jobInfo.title
      document.getElementById('job-company').textContent = jobInfo.company || 'Unknown'
      document.getElementById('job-desc').textContent = (jobInfo.description || '').slice(0, 150) + '...'
      chrome.storage.local.set({ currentJob: jobInfo })
    } else {
      document.getElementById('job-title').textContent = 'Scroll to job details and retry'
    }
  } catch (e) {
    document.getElementById('job-title').textContent = 'Refresh page and try again'
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function handleLogin() {
  const email = document.getElementById('email-input').value.trim()
  const password = document.getElementById('password-input').value.trim()

  if (!email || !password) {
    alert('Please enter email and password')
    return
  }

  showStatus('Logging in...', 'loading')

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!data.access_token) {
      throw new Error(data.error_description || data.msg || 'Login failed')
    }

    chrome.storage.local.set({ authToken: data.access_token })
    showStatus('✅ Connected!', 'success')

    setTimeout(() => {
      hideStatus()
      init()
    }, 1000)

  } catch (err) {
    showStatus('❌ ' + err.message, 'error')
  }
}

// ── Auto Apply ────────────────────────────────────────────────────────────────

async function handleAutoApply() {
  const token = await getToken()
  const job = await getCurrentJob()

  if (!token) { alert('Please login first'); return }
  if (!job?.title) { alert('No job detected. Go to a LinkedIn job posting.'); return }

  showStatus('⚡ Generating application...', 'loading')

  try {
    const res = await fetch(`${API_URL}/api/v1/agents/scrape-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        role: job.title,
        location: 'Any',
        skills: 'Python, JavaScript, Communication',
        count: 1
      })
    })

    if (!res.ok) throw new Error('API error ' + res.status)

    showStatus('✅ Application generated!', 'success')
    showResult('✉️ Done', 'Application generated! Open dashboard to view.')
    setTimeout(hideStatus, 3000)

  } catch (err) {
    showStatus('❌ ' + err.message, 'error')
  }
}

// ── Add to Job List ───────────────────────────────────────────────────────────

async function handleAddJob() {
  const token = await getToken()
  const job = await getCurrentJob()

  if (!token) { alert('Please login first'); return }
  if (!job?.title) { alert('No job detected'); return }

  showStatus('📋 Adding to Job Tracker...', 'loading')

  try {
    const res = await fetch(`${API_URL}/api/v1/jobs/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        company: job.company || 'Unknown',
        role: job.title,
        job_url: job.url,
        status: 'applied',
        work_mode: 'remote',
        job_type: 'full-time',
      })
    })

    if (!res.ok) throw new Error('Failed ' + res.status)
    showStatus('✅ Added to Job Tracker!', 'success')
    setTimeout(hideStatus, 3000)

  } catch (err) {
    showStatus('❌ ' + err.message, 'error')
  }
}

// ── Event Listeners ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Login
  document.getElementById('login-btn')
    .addEventListener('click', handleLogin)

  // Enter key on password
  document.getElementById('password-input')
    .addEventListener('keydown', e => {
      if (e.key === 'Enter') handleLogin()
    })

  // Main buttons
  document.getElementById('auto-apply-btn')
    .addEventListener('click', handleAutoApply)

  document.getElementById('add-job-btn')
    .addEventListener('click', handleAddJob)

  document.getElementById('dashboard-btn')
    .addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
    })

  document.getElementById('logout-btn')
    .addEventListener('click', () => {
      chrome.storage.local.remove(['authToken'])
      init()
    })

  const dashBtn2 = document.getElementById('dashboard-btn-2')
  if (dashBtn2) {
    dashBtn2.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:3000/dashboard' })
    })
  }

  // Initialize
  init()
})