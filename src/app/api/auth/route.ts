import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

/**
 * POST /api/auth
 * Body: { action: 'signup' | 'login' | 'logout', email, password, firstName?, lastName? }
 *
 * GET /api/auth
 * Headers: Authorization: Bearer <access_token> (optional)
 * Returns the authenticated user and their profile from public.users_table.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

  const { data: authData, error: authError } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json(
      { authenticated: false, user: null, profile: null, error: authError?.message ?? 'Not authenticated' },
      { status: 401 },
    )
  }

  const email = authData.user.email
  let profile = null
  if (email) {
    const { data: rows } = await supabase
      .from('users_table')
      .select('*')
      .eq('student_email', email)
    if (rows && rows.length > 0) {
      profile = rows[rows.length - 1]
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: authData.user,
    profile,
  })
}

export async function POST(request: Request) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = (body.action ?? 'login').toLowerCase()
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : (typeof body.first_name === 'string' ? body.first_name.trim() : '')
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : (typeof body.last_name === 'string' ? body.last_name.trim() : '')

  if (action === 'logout') {
    const { error } = await supabase.auth.signOut()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Logged out successfully' })
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  if (action === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName || 'Intern',
          last_name: lastName || 'Student',
          firstName: firstName || 'Intern',
          lastName: lastName || 'Student',
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Also initialize user row in public.users_table
    const { data: existing } = await supabase
      .from('users_table')
      .select('*')
      .eq('student_email', email)

    let profile = existing && existing.length > 0 ? existing[existing.length - 1] : null
    if (!profile) {
      const { data: inserted } = await supabase
        .from('users_table')
        .insert({
          id: data.user?.id ?? null,
          first_name: firstName || 'Intern',
          last_name: lastName || 'Student',
          student_email: email,
        })
        .select()
      profile = inserted?.[0] ?? null
    }

    return NextResponse.json(
      {
        message: data.session ? 'Account created and signed in.' : 'Account created. Check email for confirmation link.',
        user: data.user,
        session: data.session,
        access_token: data.session?.access_token ?? null,
        profile,
      },
      { status: 201 },
    )
  }

  // Default: action === 'login'
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  const { data: rows } = await supabase
    .from('users_table')
    .select('*')
    .eq('student_email', email)

  const profile = rows && rows.length > 0 ? rows[rows.length - 1] : null

  return NextResponse.json({
    message: 'Logged in successfully',
    user: data.user,
    session: data.session,
    access_token: data.session?.access_token ?? null,
    profile,
  })
}

