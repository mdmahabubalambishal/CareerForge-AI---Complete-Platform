'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#06080d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0c8] to-[#4d9fff] flex items-center justify-center text-black font-bold text-sm">⚡</div>
            <span className="text-white font-bold text-xl">Career<span className="text-[#00f0c8]">Forge</span> AI</span>
          </div>
          <p className="text-[#4a6680] text-sm">Welcome back</p>
        </div>

        {/* Card */}
        <div className="bg-[#0c1018] border border-[#1e2838] rounded-2xl p-8">
          <h1 className="text-white text-2xl font-bold mb-6">Sign in</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
                placeholder="••••••••"
                required
                className="w-full bg-[#111620] border border-[#1e2838] rounded-lg px-4 py-3 text-white text-sm placeholder-[#4a6680] focus:outline-none focus:border-[#00f0c8] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00f0c8] text-black font-bold py-3 rounded-lg text-sm hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="text-[#4a6680] text-sm text-center mt-6">
            Don't have an account?{' '}
            <Link href="/signup" className="text-[#00f0c8] hover:underline">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}