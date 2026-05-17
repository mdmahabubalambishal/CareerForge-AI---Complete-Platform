import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}

export default function Home() {
  return (
    <main>
      <h1>CareerForge AI 🚀</h1>
      <p>Next.js is working successfully.</p>
    </main>
  )
}