const API_URL = process.env.NEXT_PUBLIC_API_URL?.trim() || 'http://127.0.0.1:8000'

function buildApiUrl(path: string) {
  let rawBase = API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000')

  // Use IPv4 for localhost backend requests to avoid browser localhost resolving to IPv6 (::1)
  rawBase = rawBase.replace(/^http:\/\/localhost(:(\d+))?/, 'http://127.0.0.1$1')
  rawBase = rawBase.replace(/^https:\/\/localhost(:(\d+))?/, 'https://127.0.0.1$1')

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      if (rawBase.includes('localhost')) {
        rawBase = rawBase.replace('localhost', hostname)
      }
      if (rawBase.includes('127.0.0.1')) {
        rawBase = rawBase.replace('127.0.0.1', hostname)
      }
    }
  }

  const url = new URL(path.replace(/^\//, ''), `${rawBase.replace(/\/$/, '')}/`)
  if (!API_URL && typeof window !== 'undefined') {
    url.port = '8000'
  }
  return url.toString()
}

async function getAuthHeaders() {
  const { createClient } = await import('./supabase/client')
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Session error:', error)
    throw new Error('Authentication error')
  }

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  }
}

export const resumeApi = {
  async generate(payload: {
    user_data: object
    target_role: string
    target_company?: string
    title?: string
  }) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async list() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/list`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async get(id: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/${id}`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async update(id: string, data: object) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async scoreATS(resume_id: string, job_description: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/score`, {
      method: 'POST', headers,
      body: JSON.stringify({ resume_id, job_description })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async matchJD(resume_id: string, jd_text: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/match-jd`, {
      method: 'POST', headers,
      body: JSON.stringify({ resume_id, jd_text })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async exportPDF(resume_id: string, filename: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/${resume_id}/export/pdf`, { headers })
    if (!res.ok) throw new Error('PDF export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename + '.pdf'
    a.click()
    URL.revokeObjectURL(url)
  },

  async atsHistory(resume_id: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/resume/${resume_id}/ats-history`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const writingApi = {
  async coverLetter(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/cover-letter`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async sop(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/sop`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async bio(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/bio`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async coldEmail(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/cold-email`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async thankYouEmail(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/thank-you-email`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async salaryNegotiation(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/salary-negotiation`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async jdTranslator(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/jd-translator`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async networkingMessage(data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/networking-message`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async generate(type: string, data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/writing/${type}`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async referralRequest(data: {
    sender_info: string
    target_person: string
    target_company: string
    target_role: string
    relationship?: string
    platform?: string
})   {
    return this.generate('referral-request', data)
},

  async noc(data: {
    employee_info: string
    company: string
    duration: string
    role: string
    purpose: string
    document_type?: string
})   {
    return this.generate('noc', data)
},

  async freelanceProfile(data: {
    platform: string
    freelancer_info: string
    skills: string
    target_clients?: string
})   {
    return this.generate('freelance-profile', data)
},

  async mentorFinder(data: {
    mentee_info: string
    mentor_type: string
    goals: string
    platform?: string
})   {
    return this.generate('mentor-finder', data)
},

  async recommendationLetter(data: {
    person_info: string
    recommender_info: string
    purpose: string
    strengths: string
    letter_type?: string
})   {
    return this.generate('recommendation-letter', data)
},

}
export const knowledgeApi = {
  async uploadPDF(file: File, title: string) {
    const { createClient } = await import('./supabase/client')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)

    const res = await fetch(`${API_URL}/api/v1/knowledge/upload/pdf`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session.access_token}` },
      body: formData,
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async uploadText(title: string, content: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/upload/text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, content }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async uploadURL(url: string, title: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/upload/url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, title }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async listDocuments() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/documents`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async deleteDocument(id: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/documents/${id}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async chat(message: string, sessionId?: string, useRag: boolean = true) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, session_id: sessionId, use_rag: useRag }),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async listSessions() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/sessions`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getMessages(sessionId: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/sessions/${sessionId}/messages`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async deleteSession(sessionId: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/knowledge/sessions/${sessionId}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const jobsApi = {
  async createApplication(data: {
    company: string
    role: string
    status?: string
    priority?: string
    job_type?: string
    work_mode?: string
    salary_min?: number
    salary_max?: number
    currency?: string
    location?: string
    job_url?: string
    follow_up_date?: string
    notes?: string
  }) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/applications`, {
      method: 'POST', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async listApplications() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/applications`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async updateApplication(id: string, data: object) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/applications/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async deleteApplication(id: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/applications/${id}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getStats() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/applications/stats`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async salaryInsights(role: string, location?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/salary/insights`, {
      method: 'POST', headers,
      body: JSON.stringify({ role, location })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async analyzeOffer(offer_text: string, role: string, company: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/offer/analyze`, {
      method: 'POST', headers,
      body: JSON.stringify({ offer_text, role, company })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // ✅ role parameter যোগ করা হয়েছে
  async marketTrends(role?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/market/trends`, {
      method: 'POST', headers,
      body: JSON.stringify({ role })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // ✅ role parameter যোগ করা হয়েছে
  async remoteBD(role?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/jobs/remote/bd`, {
      method: 'POST', headers,
      body: JSON.stringify({ role })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const interviewApi = {
  async companyQuestions(company: string, role: string, round_type: string = 'technical', count: number = 5) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/interview/company-questions`, {
      method: 'POST', headers,
      body: JSON.stringify({ company, role, round_type, count })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async generateQuiz(role: string, topic: string, difficulty: string = 'medium', count: number = 5) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/interview/quiz/generate`, {
      method: 'POST', headers,
      body: JSON.stringify({ role, topic, difficulty, count })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async companyResearch(company: string, role?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/interview/company-research`, {
      method: 'POST', headers,
      body: JSON.stringify({ company, role })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async skillGapQuiz(role: string, current_skills: string, count: number = 5) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/interview/skill-gap-quiz`, {
      method: 'POST', headers,
      body: JSON.stringify({ role, current_skills, count })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async evaluateAnswer(question: string, answer: string, role: string, company?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/interview/evaluate-answer`, {
      method: 'POST', headers,
      body: JSON.stringify({ question, answer, role, company })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const analyticsApi = {
  async getOverview() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/overview`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getSkills() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/skills`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async addSkill(skill_name: string, level: number, notes?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/skills`, {
      method: 'POST', headers,
      body: JSON.stringify({ skill_name, level, notes })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async updateSkill(id: string, level: number, notes?: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/skills/${id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ level, notes })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async deleteSkill(id: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/skills/${id}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getWeeklyReport() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/analytics/weekly-report`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const agentsApi = {
  async scrapeJobs(role: string, location: string, skills: string, count: number = 8) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/scrape-jobs`, {
      method: 'POST', headers,
      body: JSON.stringify({ role, location, skills, count })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getScrapedJobs() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/scraped-jobs`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async clearScrapedJobs() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/scraped-jobs`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async autoApply(scraped_job_id: string, user_profile: object) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/auto-apply`, {
      method: 'POST', headers,
      body: JSON.stringify({ scraped_job_id, user_profile })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async bulkApply(data: {
    role: string
    location: string
    skills: string
    user_profile: object
    min_match_score?: number
    max_applications?: number
  }) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/bulk-apply`, {
      method: 'POST', headers,
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getHistory() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/agents/history`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const portfolioApi = {
  async generate(resume_id?: string, manual_data?: any, theme = 'dark', photo_url?: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/v1/portfolio/generate`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_id, manual_data, theme, photo_url }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
},

  async get() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/portfolio/`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async update(data: object, theme: string = 'dark') {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/portfolio/`, {
      method: 'PUT', headers,
      body: JSON.stringify({ data, theme })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  // api.ts এ portfolioApi তে এগুলো যোগ করো:

  async getAnalytics() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/portfolio/analytics`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async updateSettings(settings: { is_public?: boolean; slug?: string; custom_domain?: string }) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/portfolio/settings`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}

export const billingApi = {
  async getPlans() {
    const res = await fetch(`${API_URL}/api/v1/billing/plans`)
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async getMyPlan() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/billing/my-plan`, { headers })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async createStripeCheckout(plan: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/billing/stripe/checkout`, {
      method: 'POST', headers,
      body: JSON.stringify({
        plan,
        gateway: 'stripe',
        success_url: `${window.location.origin}/dashboard/billing`,
        cancel_url: `${window.location.origin}/dashboard/billing`,
      })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async createSSLCommerzPayment(plan: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/billing/sslcommerz/init`, {
      method: 'POST', headers,
      body: JSON.stringify({ plan })
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async mockUpgrade(plan: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/billing/mock-upgrade?plan=${plan}`, {
      method: 'POST', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },

  async cancel() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/v1/billing/cancel`, {
      method: 'POST', headers
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
}


