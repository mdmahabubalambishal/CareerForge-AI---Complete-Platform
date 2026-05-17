'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-white text-xl font-bold mb-2">Check your email</h2>
          <p className="text-[#4a6680] text-sm">We sent a confirmation link to <strong className="text-white">{email}</strong></p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#06080d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] flex items-center justify-center text-black font-bold text-sm">⚡</div>
            <span className="text-white font-bold text-xl">Career<span className="text-[#00f0c8]">Forge</span> AI</span>
          </div>
          <p className="text-[#4a6680] text-sm">Start your career journey</p>
        </div>

        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8">
          <h1 className="text-white text-2xl font-bold mb-6">Create account</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-[#7a96b0] text-sm font-medium block mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Mahabub Alam Bishal"
                required
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg px-4 py-3 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#7a96b0] text-sm font-medium block mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg px-4 py-3 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
              />
            </div>
            <div>
              <label className="text-[#7a96b0] text-sm font-medium block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                minLength={8}
                required
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg px-4 py-3 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm hover:bg-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p className="text-[#4a6680] text-sm text-center mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00f0c8] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}