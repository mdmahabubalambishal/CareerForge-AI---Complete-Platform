// content.js — Injected into LinkedIn, Indeed, Glassdoor job pages

(function () {
  'use strict';

  // ── Platform Detection ──────────────────────────────────────────────────────
  const host = window.location.hostname;
  const isLinkedIn = host.includes('linkedin.com');
  const isIndeed = host.includes('indeed.com');
  const isGlassdoor = host.includes('glassdoor.com');

  // ── Job Data Extractors ─────────────────────────────────────────────────────

  function extractLinkedIn() {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
      return '';
    };

    const role = getText([
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      'h1.t-24',
      '.job-view-layout h1',
    ]);

    const company = getText([
      '.job-details-jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name a',
      '.topcard__org-name-link',
      '.job-details-jobs-unified-top-card__company-name',
    ]);

    const location = getText([
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet',
    ]);

    const salary = getText([
      '.job-details-jobs-unified-top-card__job-insight span',
      '.jobs-unified-top-card__job-insight span',
      '.compensation__salary-range',
    ]);

    const workMode = detectWorkMode(role + ' ' + location);

    return {
      platform: 'LinkedIn',
      role: role || '',
      company: company || '',
      location: location || '',
      salary_text: salary || '',
      work_mode: workMode,
      job_url: window.location.href,
    };
  }

  function extractIndeed() {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
      return '';
    };

    const role = getText([
      '[data-testid="jobsearch-JobInfoHeader-title"] span',
      '.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      'h1[class*="Title"]',
    ]);

    const company = getText([
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '.icl-u-lg-mr--sm a',
      '[data-company-name]',
    ]);

    const location = getText([
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
      '.icl-u-xs-mt--xs .icl-u-lg-mr--sm',
    ]);

    const salary = getText([
      '[data-testid="attribute_snippet_testid"]',
      '.icl-u-xs-mr--xs',
      '[class*="salary"]',
    ]);

    const workMode = detectWorkMode(role + ' ' + location + ' ' + salary);

    return {
      platform: 'Indeed',
      role: role || '',
      company: company || '',
      location: location || '',
      salary_text: salary || '',
      work_mode: workMode,
      job_url: window.location.href,
    };
  }

  function extractGlassdoor() {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText.trim()) return el.innerText.trim();
      }
      return '';
    };

    const role = getText([
      '[data-test="job-title"]',
      '.job-title',
      'h1[class*="title"]',
      '.css-1j389vi',
    ]);

    const company = getText([
      '[data-test="employer-name"]',
      '.employer-name',
      '[class*="employerName"]',
    ]);

    const location = getText([
      '[data-test="location"]',
      '.location',
      '[class*="location"]',
    ]);

    const salary = getText([
      '[data-test="detailSalary"]',
      '[class*="salary"]',
      '.salaryEstimate',
    ]);

    const workMode = detectWorkMode(role + ' ' + location);

    return {
      platform: 'Glassdoor',
      role: role || '',
      company: company || '',
      location: location || '',
      salary_text: salary || '',
      work_mode: workMode,
      job_url: window.location.href,
    };
  }

  function detectWorkMode(text) {
    const lower = text.toLowerCase();
    if (lower.includes('remote')) return 'remote';
    if (lower.includes('hybrid')) return 'hybrid';
    if (lower.includes('on-site') || lower.includes('onsite') || lower.includes('in-person')) return 'onsite';
    return 'remote';
  }

  function parseSalary(salaryText) {
    if (!salaryText) return { min: null, max: null, currency: 'USD' };
    const currency = salaryText.includes('৳') ? 'BDT' :
      salaryText.includes('£') ? 'GBP' :
        salaryText.includes('€') ? 'EUR' : 'USD';

    const numbers = salaryText.replace(/[^0-9.,K]/gi, ' ')
      .split(/\s+/)
      .map(n => {
        const clean = n.replace(/,/g, '').replace(/K$/i, '000');
        return parseFloat(clean);
      })
      .filter(n => !isNaN(n) && n > 0);

    return {
      min: numbers[0] || null,
      max: numbers[1] || null,
      currency,
    };
  }

  // ── Extract job data based on platform ──────────────────────────────────────
  function extractJobData() {
    if (isLinkedIn) return extractLinkedIn();
    if (isIndeed) return extractIndeed();
    if (isGlassdoor) return extractGlassdoor();
    return null;
  }

  // ── Create Floating Button ──────────────────────────────────────────────────
  function createFloatingButton() {
    if (document.getElementById('cf-tracker-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'cf-tracker-btn';
    btn.innerHTML = `
      <div class="cf-btn-icon">⚡</div>
      <div class="cf-btn-text">Track Job</div>
    `;
    btn.title = 'Save to CareerForge AI';
    document.body.appendChild(btn);

    btn.addEventListener('click', () => {
      showModal();
    });
  }

  // ── Modal UI ────────────────────────────────────────────────────────────────
  function showModal() {
    if (document.getElementById('cf-modal-overlay')) return;

    const jobData = extractJobData();
    if (!jobData) return;

    const salary = parseSalary(jobData.salary_text);

    const overlay = document.createElement('div');
    overlay.id = 'cf-modal-overlay';
    overlay.innerHTML = `
      <div class="cf-modal">
        <div class="cf-modal-header">
          <div class="cf-modal-title">
            <span class="cf-logo">⚡</span>
            <span>Track on CareerForge AI</span>
          </div>
          <button class="cf-close-btn" id="cf-close">✕</button>
        </div>

        <div class="cf-platform-badge">${jobData.platform}</div>

        <div class="cf-form">
          <div class="cf-form-row">
            <div class="cf-form-group">
              <label class="cf-label">Company</label>
              <input class="cf-input" id="cf-company" value="${escapeHtml(jobData.company)}" placeholder="Company name" />
            </div>
            <div class="cf-form-group">
              <label class="cf-label">Role</label>
              <input class="cf-input" id="cf-role" value="${escapeHtml(jobData.role)}" placeholder="Job title" />
            </div>
          </div>

          <div class="cf-form-row">
            <div class="cf-form-group">
              <label class="cf-label">Status</label>
              <select class="cf-input" id="cf-status">
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
              </select>
            </div>
            <div class="cf-form-group">
              <label class="cf-label">Work Mode</label>
              <select class="cf-input" id="cf-workmode">
                <option value="remote" ${jobData.work_mode === 'remote' ? 'selected' : ''}>Remote</option>
                <option value="hybrid" ${jobData.work_mode === 'hybrid' ? 'selected' : ''}>Hybrid</option>
                <option value="onsite" ${jobData.work_mode === 'onsite' ? 'selected' : ''}>Onsite</option>
              </select>
            </div>
          </div>

          <div class="cf-form-row">
            <div class="cf-form-group">
              <label class="cf-label">Location</label>
              <input class="cf-input" id="cf-location" value="${escapeHtml(jobData.location)}" placeholder="Location" />
            </div>
            <div class="cf-form-group">
              <label class="cf-label">Priority</label>
              <select class="cf-input" id="cf-priority">
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div class="cf-form-row">
            <div class="cf-form-group">
              <label class="cf-label">Min Salary</label>
              <input class="cf-input" id="cf-salary-min" type="number" value="${salary.min || ''}" placeholder="Min" />
            </div>
            <div class="cf-form-group">
              <label class="cf-label">Max Salary</label>
              <input class="cf-input" id="cf-salary-max" type="number" value="${salary.max || ''}" placeholder="Max" />
            </div>
            <div class="cf-form-group">
              <label class="cf-label">Currency</label>
              <select class="cf-input" id="cf-currency">
                <option value="USD" ${salary.currency === 'USD' ? 'selected' : ''}>USD</option>
                <option value="BDT" ${salary.currency === 'BDT' ? 'selected' : ''}>BDT</option>
                <option value="EUR" ${salary.currency === 'EUR' ? 'selected' : ''}>EUR</option>
                <option value="GBP" ${salary.currency === 'GBP' ? 'selected' : ''}>GBP</option>
              </select>
            </div>
          </div>

          <div class="cf-form-group">
            <label class="cf-label">Notes</label>
            <textarea class="cf-input cf-textarea" id="cf-notes" placeholder="Any notes about this job...">${jobData.salary_text ? 'Salary info: ' + escapeHtml(jobData.salary_text) : ''}</textarea>
          </div>

          <div id="cf-message" class="cf-message" style="display:none"></div>

          <div class="cf-btn-row">
            <button class="cf-cancel-btn" id="cf-cancel">Cancel</button>
            <button class="cf-save-btn" id="cf-save">⚡ Save to CareerForge</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('cf-close').addEventListener('click', closeModal);
    document.getElementById('cf-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.getElementById('cf-save').addEventListener('click', () => saveJob(jobData.job_url));
  }

  function closeModal() {
    const overlay = document.getElementById('cf-modal-overlay');
    if (overlay) overlay.remove();
  }

  function showMessage(text, type) {
    const el = document.getElementById('cf-message');
    if (!el) return;
    el.style.display = 'block';
    el.className = 'cf-message cf-message-' + type;
    el.textContent = text;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function saveJob(jobUrl) {
    const saveBtn = document.getElementById('cf-save');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    const payload = {
      company: document.getElementById('cf-company')?.value || '',
      role: document.getElementById('cf-role')?.value || '',
      status: document.getElementById('cf-status')?.value || 'applied',
      work_mode: document.getElementById('cf-workmode')?.value || 'remote',
      location: document.getElementById('cf-location')?.value || '',
      priority: document.getElementById('cf-priority')?.value || 'medium',
      salary_min: parseInt(document.getElementById('cf-salary-min')?.value) || null,
      salary_max: parseInt(document.getElementById('cf-salary-max')?.value) || null,
      currency: document.getElementById('cf-currency')?.value || 'USD',
      notes: document.getElementById('cf-notes')?.value || '',
      job_url: jobUrl,
      job_type: 'full-time',
    };

    if (!payload.company || !payload.role) {
      showMessage('❌ Company and Role are required!', 'error');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '⚡ Save to CareerForge'; }
      return;
    }

    // Send to background script
    chrome.runtime.sendMessage({ action: 'saveJob', payload }, (response) => {
      if (chrome.runtime.lastError) {
        showMessage('❌ Extension error: ' + chrome.runtime.lastError.message, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '⚡ Save to CareerForge'; }
        return;
      }
      if (response?.success) {
        showMessage('✅ Saved to CareerForge AI!', 'success');
        // Update button
        const trackerBtn = document.getElementById('cf-tracker-btn');
        if (trackerBtn) {
          trackerBtn.classList.add('cf-saved');
          trackerBtn.querySelector('.cf-btn-text').textContent = 'Saved!';
        }
        setTimeout(closeModal, 1500);
      } else {
        showMessage('❌ ' + (response?.error || 'Failed to save. Check if you are logged in.'), 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '⚡ Save to CareerForge'; }
      }
    });
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  function init() {
    // Wait a bit for page to fully load
    setTimeout(() => {
      const jobData = extractJobData();
      if (jobData && (jobData.role || jobData.company)) {
        createFloatingButton();
      }
    }, 1500);

    // Also watch for URL changes (SPA navigation)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        const existingBtn = document.getElementById('cf-tracker-btn');
        if (existingBtn) existingBtn.remove();
        setTimeout(() => {
          const jobData = extractJobData();
          if (jobData && (jobData.role || jobData.company)) {
            createFloatingButton();
          }
        }, 2000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  init();
})();