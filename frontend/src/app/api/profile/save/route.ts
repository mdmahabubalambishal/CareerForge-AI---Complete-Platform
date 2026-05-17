// app/api/profile/save/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const {
      slug, name, title, bio, location,
      linkedin, github, website,
      show_stats, show_skills, show_achievements, is_public
    } = body

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('public_profiles')
      .upsert({
        user_id: user.id,
        slug,
        name,
        title,
        bio,
        location,
        linkedin,
        github,
        website,
        show_stats,
        show_skills,
        show_achievements,
        is_public,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) {
      console.error('[Profile Save] Error:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This URL is already taken. Please generate a new one.' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data })

  } catch (err: any) {
    console.error('[Profile Save] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}