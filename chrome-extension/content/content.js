function extractJobInfo() {
  // Multiple selectors try করো — LinkedIn DOM বদলায়
  const titleSelectors = [
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    '.t-24.t-bold',
    'h1.t-24',
    'h1',
  ]

  const companySelectors = [
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name',
    '.jobs-details-top-card__company-url',
    '.app-aware-link.t-black',
    '[data-tracking-control-name="public_jobs_topcard-org-name"]',
  ]

  const locationSelectors = [
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    '.jobs-details-top-card__bullet',
    '.t-black--light.mt2',
  ]

  const descSelectors = [
    '.jobs-description__content',
    '.jobs-description-content__text',
    '#job-details',
    '.description__text',
  ]

  function trySelectors(selectors) {
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el?.innerText?.trim()) return el.innerText.trim()
    }
    return null
  }

  const title = trySelectors(titleSelectors)
  const company = trySelectors(companySelectors)
  const location = trySelectors(locationSelectors)
  const description = trySelectors(descSelectors)?.slice(0, 1000)
  const url = window.location.href

  return { title, company, location, description, url }
}

// Button add করো
function addCareerForgeButton() {
  if (document.getElementById('cf-apply-btn')) return

  const applyContainerSelectors = [
    '.jobs-apply-button--top-card',
    '.jobs-s-apply',
    '.jobs-apply-button',
    '.jobs-unified-top-card__content--two-pane',
  ]

  let container = null
  for (const sel of applyContainerSelectors) {
    container = document.querySelector(sel)
    if (container) break
  }

  if (!container) return

  const btn = document.createElement('button')
  btn.id = 'cf-apply-btn'
  btn.innerHTML = '⚡ CareerForge'
  btn.style.cssText = `
    background: #00f0c8;
    color: #000;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    margin-left: 8px;
    font-family: system-ui, sans-serif;
    vertical-align: middle;
  `

  btn.addEventListener('click', () => {
    const jobInfo = extractJobInfo()
    chrome.storage.local.set({ currentJob: jobInfo })
  })

  container.appendChild(btn)
}

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_JOB_INFO') {
    const info = extractJobInfo()
    sendResponse(info)
    return true
  }
})

// Observer
const observer = new MutationObserver(() => {
  if (window.location.href.includes('/jobs/')) {
    setTimeout(addCareerForgeButton, 2000)
  }
})

observer.observe(document.body, { childList: true, subtree: true })

// Initial
setTimeout(() => {
  if (window.location.href.includes('/jobs/')) {
    addCareerForgeButton()
  }
}, 2000)