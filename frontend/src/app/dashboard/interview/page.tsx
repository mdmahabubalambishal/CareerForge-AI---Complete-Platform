'use client'
import { useState, useRef } from 'react'
import { interviewApi } from '@/lib/api'

type Tab = 'questions' | 'quiz' | 'research' | 'skill-quiz' | 'voice'

export default function InterviewPage() {
  const [tab, setTab] = useState<Tab>('questions')

  // Company Questions
  const [company, setCompany] = useState('Google')
  const [role, setRole] = useState('LLM Engineer')
  const [roundType, setRoundType] = useState('technical')
  const [questions, setQuestions] = useState<any[]>([])
  const [selectedQ, setSelectedQ] = useState<any>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<any>(null)

  // Quiz
  const [quizRole, setQuizRole] = useState('LLM Engineer')
  const [quizTopic, setQuizTopic] = useState('Python')
  const [quizDifficulty, setQuizDifficulty] = useState('medium')
  const [quizQuestions, setQuizQuestions] = useState<any[]>([])
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  // Research
  const [researchCompany, setResearchCompany] = useState('Google')
  const [researchRole, setResearchRole] = useState('LLM Engineer')
  const [researchData, setResearchData] = useState<any>(null)

  // Skill Gap Quiz
  const [sgRole, setSgRole] = useState('LLM Engineer')
  const [sgSkills, setSgSkills] = useState('Python, LangChain, FastAPI')
  const [sgQuestions, setSgQuestions] = useState<any[]>([])
  const [sgAnswers, setSgAnswers] = useState<Record<number, string>>({})
  const [sgSubmitted, setSgSubmitted] = useState(false)

  // Voice
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceQuestion, setVoiceQuestion] = useState('Tell me about yourself and your experience with LLM systems.')
  const [voiceEval, setVoiceEval] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef<string>('')

  const [loading, setLoading] = useState(false)

  const inputCls = "w-full bg-[#111620] border border-[#1e2838] rounded-lg px-3 py-2.5 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
  const labelCls = "text-[#7a96b0] text-xs font-medium block mb-1.5"

  const tabs = [
    { id: 'questions', label: '🏢 Company Questions' },
    { id: 'quiz', label: '🧪 Tech Quiz' },
    { id: 'research', label: '🔬 Company Research' },
    { id: 'skill-quiz', label: '🧩 Skill Gap Quiz' },
    { id: 'voice', label: '🎤 Voice Practice' },
  ]

  // Company Questions
  async function handleGetQuestions(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setQuestions([])
    setSelectedQ(null)
    setEvaluation(null)
    try {
      const data = await interviewApi.companyQuestions(company, role, roundType, 5)
      setQuestions(data.questions)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEvaluate() {
    if (!selectedQ || !userAnswer.trim()) return
    setLoading(true)
    try {
      const data = await interviewApi.evaluateAnswer(selectedQ.question, userAnswer, role, company)
      setEvaluation(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Quiz
  async function handleGenerateQuiz(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setQuizQuestions([])
    setQuizAnswers({})
    setQuizSubmitted(false)
    setQuizScore(0)
    try {
      const data = await interviewApi.generateQuiz(quizRole, quizTopic, quizDifficulty, 5)
      setQuizQuestions(data.questions)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleQuizSubmit() {
    let correct = 0
    quizQuestions.forEach((q, i) => {
      if (quizAnswers[i]?.charAt(0) === q.correct) correct++
    })
    setQuizScore(correct)
    setQuizSubmitted(true)
  }

  // Research
  async function handleResearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResearchData(null)
    try {
      const data = await interviewApi.companyResearch(researchCompany, researchRole)
      setResearchData(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Skill Gap Quiz
  async function handleSkillGapQuiz(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSgQuestions([])
    setSgAnswers({})
    setSgSubmitted(false)
    try {
      const data = await interviewApi.skillGapQuiz(sgRole, sgSkills, 5)
      setSgQuestions(data.questions)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Voice
  function startRecording() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech Recognition not supported. Please use Chrome.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'en-US'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      recognition.speechRecognitionList = undefined

      transcriptRef.current = ''
      setTranscript('')
      setVoiceEval(null)

      recognition.onstart = () => {
        setIsRecording(true)
      }

      recognition.onresult = (e: any) => {
        let full = ''
        for (let i = 0; i < e.results.length; i++) {
          full += e.results[i][0].transcript
        }
        transcriptRef.current = full
        setTranscript(full)
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          alert('Microphone permission denied. Allow microphone in Chrome settings.')
        } else if (e.error === 'no-speech') {
          alert('No speech detected. Please speak clearly.')
        } else {
          alert('Error: ' + e.error)
        }
        setIsRecording(false)
      }

      recognition.onend = () => {
        setIsRecording(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err: any) {
      alert('Could not start: ' + err.message)
      setIsRecording(false)
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  async function handleVoiceEvaluate() {
    const text = transcriptRef.current || transcript
    if (!text.trim()) {
      alert('No transcript found. Please record your answer first.')
      return
    }
    setLoading(true)
    try {
      const data = await interviewApi.evaluateAnswer(voiceQuestion, text, role, company)
      setVoiceEval(data)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const diffColor = (d: string) =>
    d === 'easy' ? '#39e87a' : d === 'medium' ? '#ffd84d' : '#ff5c9c'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Interview Prep Suite</h1>
        <p className="text-[#4a6680] text-sm mt-1">Company questions · Tech quiz · Research · Voice practice</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#0c1018] border border-[#1e2838] rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-[#00f0c8] text-black' : 'text-[#7a96b0] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* COMPANY QUESTIONS */}
      {tab === 'questions' && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <form onSubmit={handleGetQuestions} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-4">
              <div className="text-sm font-bold text-white mb-4">Generate Questions</div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Company *</label>
                  <input className={inputCls} value={company} onChange={e => setCompany(e.target.value)} placeholder="Google" required />
                </div>
                <div>
                  <label className={labelCls}>Role *</label>
                  <input className={inputCls} value={role} onChange={e => setRole(e.target.value)} placeholder="LLM Engineer" required />
                </div>
                <div>
                  <label className={labelCls}>Round Type</label>
                  <select className={inputCls} value={roundType} onChange={e => setRoundType(e.target.value)}>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="system_design">System Design</option>
                    <option value="coding">Coding</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
                  {loading ? 'Generating...' : '🏢 Get Questions'}
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={i}
                  onClick={() => { setSelectedQ(q); setUserAnswer(''); setEvaluation(null) }}
                  className={`bg-[#0c1018] border rounded-xl p-3 cursor-pointer transition-all ${
                    selectedQ === q ? 'border-[#00f0c8]' : 'border-[#1e2838] hover:border-[#263040]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#4a6680]">Q{i + 1}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold"
                      style={{ background: diffColor(q.difficulty) + '20', color: diffColor(q.difficulty) }}>
                      {q.difficulty}
                    </span>
                  </div>
                  <div className="text-sm text-white line-clamp-2">{q.question}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2">
            {selectedQ ? (
              <div className="space-y-4">
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded font-bold uppercase"
                      style={{ background: diffColor(selectedQ.difficulty) + '20', color: diffColor(selectedQ.difficulty) }}>
                      {selectedQ.difficulty}
                    </span>
                    <span className="text-xs text-[#4a6680]">{selectedQ.type}</span>
                  </div>
                  <div className="text-base font-medium text-white mb-4">{selectedQ.question}</div>
                  <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                    <div className="text-xs text-[#00f0c8] uppercase tracking-wide mb-1">Hint</div>
                    <div className="text-xs text-[#7a96b0]">{selectedQ.hint}</div>
                  </div>
                </div>

                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                  <label className="text-sm font-bold text-white block mb-3">Your Answer</label>
                  <textarea
                    className={inputCls + ' resize-none'}
                    rows={5}
                    placeholder="Type your answer here..."
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                  />
                  <button
                    onClick={handleEvaluate}
                    disabled={loading || !userAnswer.trim()}
                    className="w-full mt-3 bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40"
                  >
                    {loading ? 'Evaluating...' : '⚡ Evaluate My Answer'}
                  </button>
                </div>

                {evaluation && (
                  <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-bold text-white">AI Evaluation</div>
                      <div className="text-2xl font-bold"
                        style={{ color: evaluation.score >= 70 ? '#39e87a' : evaluation.score >= 50 ? '#ffd84d' : '#ff5c9c' }}>
                        {evaluation.score}/100 <span className="text-base">{evaluation.grade}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                        <div className="text-xs text-[#39e87a] font-bold mb-2">Strengths</div>
                        {evaluation.strengths?.map((s: string, i: number) => (
                          <div key={i} className="text-xs text-[#7a96b0] mb-1">• {s}</div>
                        ))}
                      </div>
                      <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                        <div className="text-xs text-[#ffd84d] font-bold mb-2">Improvements</div>
                        {evaluation.improvements?.map((s: string, i: number) => (
                          <div key={i} className="text-xs text-[#7a96b0] mb-1">• {s}</div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                      <div className="text-xs text-[#00f0c8] font-bold mb-2">Ideal Answer Points</div>
                      <div className="text-xs text-[#7a96b0]">{evaluation.ideal_answer}</div>
                    </div>
                    <div className="mt-3 text-xs text-[#7a96b0] italic">{evaluation.feedback}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-8 text-center h-64 flex items-center justify-center">
                <div>
                  <div className="text-4xl mb-3">🏢</div>
                  <div className="text-white font-bold mb-2">Generate questions first</div>
                  <div className="text-[#4a6680] text-sm">Then click a question to practice</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TECH QUIZ */}
      {tab === 'quiz' && (
        <div className="max-w-3xl">
          <form onSubmit={handleGenerateQuiz} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Role</label>
                <input className={inputCls} value={quizRole} onChange={e => setQuizRole(e.target.value)} placeholder="LLM Engineer" />
              </div>
              <div>
                <label className={labelCls}>Topic *</label>
                <input className={inputCls} value={quizTopic} onChange={e => setQuizTopic(e.target.value)} placeholder="Python / RAG / LangChain" required />
              </div>
              <div>
                <label className={labelCls}>Difficulty</label>
                <select className={inputCls} value={quizDifficulty} onChange={e => setQuizDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-3 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
              {loading ? 'Generating...' : '🧪 Generate Quiz'}
            </button>
          </form>

          {quizQuestions.length > 0 && (
            <div>
              {quizSubmitted && (
                <div className="bg-[#0c1018] border border-[#00f0c8]/30 rounded-xl p-4 mb-4 text-center">
                  <div className="text-3xl font-bold text-[#00f0c8] mb-1">{quizScore}/{quizQuestions.length}</div>
                  <div className="text-sm text-[#7a96b0]">
                    {quizScore === quizQuestions.length ? 'Perfect score!' : quizScore >= quizQuestions.length * 0.6 ? 'Good job!' : 'Keep practicing!'}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {quizQuestions.map((q, i) => (
                  <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                    <div className="text-sm font-medium text-white mb-3">Q{i + 1}. {q.question}</div>
                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const letter = opt.charAt(0)
                        const isSelected = quizAnswers[i] === opt
                        const isCorrect = quizSubmitted && letter === q.correct
                        const isWrong = quizSubmitted && isSelected && letter !== q.correct
                        return (
                          <div
                            key={opt}
                            onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [i]: opt }))}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                              isCorrect ? 'border-[#39e87a] bg-[#39e87a]/10 text-[#39e87a]' :
                              isWrong ? 'border-[#ff5c9c] bg-[#ff5c9c]/10 text-[#ff5c9c]' :
                              isSelected ? 'border-[#00f0c8] bg-[#00f0c8]/10 text-[#00f0c8]' :
                              'border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 ${
                              isSelected || isCorrect ? 'border-current' : 'border-[#1e2838]'
                            }`}>
                              {isCorrect ? '✓' : isWrong ? '✗' : letter}
                            </div>
                            {opt.substring(2)}
                          </div>
                        )
                      })}
                    </div>
                    {quizSubmitted && (
                      <div className="mt-3 bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-xs text-[#7a96b0]">
                        <span className="text-[#00f0c8] font-bold">Explanation: </span>{q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!quizSubmitted && Object.keys(quizAnswers).length === quizQuestions.length && (
                <button onClick={handleQuizSubmit} className="w-full mt-4 bg-[#00f0c8] text-black font-bold py-3 rounded-xl text-sm">
                  Submit Quiz
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* COMPANY RESEARCH */}
      {tab === 'research' && (
        <div className="max-w-4xl">
          <form onSubmit={handleResearch} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Company *</label>
                <input className={inputCls} value={researchCompany} onChange={e => setResearchCompany(e.target.value)} placeholder="Google, Anthropic, OpenAI..." required />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <input className={inputCls} value={researchRole} onChange={e => setResearchRole(e.target.value)} placeholder="LLM Engineer" />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-3 bg-[#00f0c8] text-black font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
              {loading ? 'Researching...' : '🔬 Research Company'}
            </button>
          </form>

          {researchData && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                <div className="text-base font-bold text-white mb-1">{researchCompany}</div>
                <div className="text-xs text-[#4a6680] mb-3">{researchData.founded} · {researchData.size} · {researchData.glassdoor_rating}</div>
                <p className="text-sm text-[#7a96b0] leading-relaxed mb-4">{researchData.overview}</p>
                <div className="mb-3">
                  <div className="text-xs font-bold text-[#00f0c8] uppercase tracking-wide mb-2">Tech Stack</div>
                  <div className="flex flex-wrap gap-1">
                    {researchData.tech_stack?.map((t: string) => (
                      <span key={t} className="text-xs bg-[#111620] border border-[#1e2838] text-[#7a96b0] px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#9b7bff] uppercase tracking-wide mb-2">Known For</div>
                  <div className="flex flex-wrap gap-1">
                    {researchData.known_for?.map((t: string) => (
                      <span key={t} className="text-xs bg-[#111620] border border-[#1e2838] text-[#7a96b0] px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#ffd84d] uppercase tracking-wide mb-2">Interview Process</div>
                  {researchData.interview_process?.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#7a96b0] mb-1">
                      <span className="text-[#ffd84d] flex-shrink-0">{i + 1}.</span>{s}
                    </div>
                  ))}
                </div>
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#39e87a] uppercase tracking-wide mb-2">Tips</div>
                  {researchData.tips?.map((t: string, i: number) => (
                    <div key={i} className="text-xs text-[#7a96b0] mb-1">✦ {t}</div>
                  ))}
                </div>
                <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-4">
                  <div className="text-xs font-bold text-[#4d9fff] uppercase tracking-wide mb-2">Culture</div>
                  {researchData.culture?.map((c: string, i: number) => (
                    <div key={i} className="text-xs text-[#7a96b0] mb-1">• {c}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SKILL GAP QUIZ */}
      {tab === 'skill-quiz' && (
        <div className="max-w-3xl">
          <form onSubmit={handleSkillGapQuiz} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5 mb-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Target Role *</label>
                <input className={inputCls} value={sgRole} onChange={e => setSgRole(e.target.value)} placeholder="LLM Engineer" required />
              </div>
              <div>
                <label className={labelCls}>Your Current Skills *</label>
                <input className={inputCls} value={sgSkills} onChange={e => setSgSkills(e.target.value)} placeholder="Python, LangChain, FastAPI..." required />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full mt-3 bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40">
              {loading ? 'Generating...' : '🧩 Generate Skill Gap Quiz'}
            </button>
          </form>

          {sgQuestions.length > 0 && (
            <div>
              <div className="space-y-4">
                {sgQuestions.map((q, i) => (
                  <div key={i} className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-medium text-white flex-1 pr-4">Q{i + 1}. {q.question}</div>
                      <span className="text-xs bg-[#9b7bff]/10 border border-[#9b7bff]/20 text-[#9b7bff] px-2 py-0.5 rounded flex-shrink-0">
                        {q.skill_tested}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {q.options.map((opt: string) => {
                        const letter = opt.charAt(0)
                        const isSelected = sgAnswers[i] === opt
                        const isCorrect = sgSubmitted && letter === q.correct
                        const isWrong = sgSubmitted && isSelected && letter !== q.correct
                        return (
                          <div
                            key={opt}
                            onClick={() => !sgSubmitted && setSgAnswers(prev => ({ ...prev, [i]: opt }))}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                              isCorrect ? 'border-[#39e87a] bg-[#39e87a]/10 text-[#39e87a]' :
                              isWrong ? 'border-[#ff5c9c] bg-[#ff5c9c]/10 text-[#ff5c9c]' :
                              isSelected ? 'border-[#9b7bff] bg-[#9b7bff]/10 text-[#9b7bff]' :
                              'border-[#1e2838] text-[#7a96b0] hover:border-[#263040]'
                            }`}
                          >
                            {opt}
                          </div>
                        )
                      })}
                    </div>
                    {sgSubmitted && (
                      <div className="mt-3 space-y-1">
                        <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-2 text-xs text-[#7a96b0]">
                          <span className="text-[#00f0c8] font-bold">Explanation: </span>{q.explanation}
                        </div>
                        {sgAnswers[i]?.charAt(0) !== q.correct && (
                          <div className="bg-[#111620] border border-[#ff7c4d]/20 rounded-lg p-2 text-xs text-[#ff7c4d]">
                            Learn: {q.resource}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!sgSubmitted && Object.keys(sgAnswers).length === sgQuestions.length && (
                <button
                  onClick={() => setSgSubmitted(true)}
                  className="w-full mt-4 bg-[#9b7bff] text-white font-bold py-3 rounded-xl text-sm"
                >
                  See Results & Skill Gaps
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* VOICE PRACTICE */}
      {tab === 'voice' && (
        <div className="max-w-3xl">
          <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-6 mb-4">
            <div className="text-sm font-bold text-white mb-3">Question to Practice</div>
            <select
              className={inputCls + ' mb-4'}
              value={voiceQuestion}
              onChange={e => setVoiceQuestion(e.target.value)}
            >
              <option>Tell me about yourself and your experience with LLM systems.</option>
              <option>Explain how RAG systems work and when you would use them.</option>
              <option>What is your approach to debugging a slow LLM application?</option>
              <option>Describe a challenging AI project you built and what you learned.</option>
              <option>How do you stay updated with the latest AI and ML developments?</option>
            </select>

            <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-4 mb-6">
              <div className="text-xs text-[#00f0c8] uppercase tracking-wide mb-2">Current Question</div>
              <div className="text-sm text-white">{voiceQuestion}</div>
            </div>

            <div className="text-center mb-4">
              <div className="relative inline-flex items-center justify-center mb-3">
                {isRecording && (
                  <>
                    <div className="absolute w-24 h-24 rounded-full border-2 border-[#9b7bff] animate-ping opacity-30" />
                    <div className="absolute w-20 h-20 rounded-full border-2 border-[#9b7bff] animate-ping opacity-20" style={{ animationDelay: '0.3s' }} />
                  </>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all z-10 ${
                    isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-[#9b7bff] hover:bg-[#8b6bef]'
                  }`}
                >
                  {isRecording ? '⏹' : '🎤'}
                </button>
              </div>
              <div className="text-sm text-[#4a6680]">
                {isRecording ? 'Recording... click to stop' : 'Click microphone to start speaking'}
              </div>
            </div>

            {transcript && (
              <div>
                <div className="text-xs text-[#7a96b0] uppercase tracking-wide mb-2">Your Answer (Transcript)</div>
                <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3 text-sm text-white min-h-[80px] mb-3">
                  {transcript}
                </div>
                <button
                  onClick={handleVoiceEvaluate}
                  disabled={loading}
                  className="w-full bg-[#9b7bff] text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-40"
                >
                  {loading ? 'Evaluating...' : '⚡ Evaluate My Answer'}
                </button>
              </div>
            )}
          </div>

          {voiceEval && (
            <div className="bg-[#0c1018] border border-[#1e2838] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-bold text-white">Voice Answer Evaluation</div>
                <div className="text-2xl font-bold"
                  style={{ color: voiceEval.score >= 70 ? '#39e87a' : '#ffd84d' }}>
                  {voiceEval.score}/100
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                  <div className="text-xs text-[#39e87a] font-bold mb-2">Strengths</div>
                  {voiceEval.strengths?.map((s: string, i: number) => (
                    <div key={i} className="text-xs text-[#7a96b0] mb-1">• {s}</div>
                  ))}
                </div>
                <div className="bg-[#111620] border border-[#1e2838] rounded-lg p-3">
                  <div className="text-xs text-[#ffd84d] font-bold mb-2">Improvements</div>
                  {voiceEval.improvements?.map((s: string, i: number) => (
                    <div key={i} className="text-xs text-[#7a96b0] mb-1">• {s}</div>
                  ))}
                </div>
              </div>
              <div className="text-xs text-[#7a96b0] italic">{voiceEval.feedback}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}