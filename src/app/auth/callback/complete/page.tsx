'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const ranRef = useRef(false) // avoid double-run in React strict mode

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const fail = async (msg: string, mode: 'login' | 'signup' = 'login') => {
      await supabase.auth.signOut()
      setError(msg)
      setTimeout(() => router.replace(`/login?mode=${mode}`), 2500)
    }

    const run = async () => {
      // PKCE flow returns ?code=...; the implicit flow is picked up automatically from the URL hash.
          // Google or Supabase can send back an error instead of a code
      const urlError = searchParams.get('error_description')
      if (urlError) return fail(urlError)

      // The client exchanges ?code= by itself (detectSessionInUrl: true).
      // getSession() waits for that to finish, so don't call exchangeCodeForSession here.
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return fail('Google sign-in failed. Please try again.')

      // Google can't be restricted to ".edu" generally, so enforce it here.
      const email = (user.email ?? '').toLowerCase()
      
      const meta = user.user_metadata ?? {}
      const alreadyConsented = meta.name_sharing_consent === true

      let pending: { at?: string } | null = null
      try {
        const raw = localStorage.getItem('subtle-pending-consent')
        pending = raw ? JSON.parse(raw) : null
        localStorage.removeItem('subtle-pending-consent')
      } catch {}

      // Logged in with Google but never agreed to name sharing: send them to sign up.
      if (!alreadyConsented && !pending) {
        return fail('Please create an account and agree to name sharing first.', 'signup')
      }

      // Pull names from the Google profile
      const full: string = (meta.full_name ?? meta.name ?? '').trim()
      const firstName: string = (meta.given_name ?? full.split(' ')[0] ?? '').trim()
      const lastName: string = (
        meta.family_name ?? full.split(' ').slice(1).join(' ') ?? ''
      ).trim()

      // First-time Google sign-up: record consent + names
      if (!alreadyConsented && pending) {
        const consentAt = pending.at ?? new Date().toISOString()

        await supabase.auth.updateUser({
          data: {
            first_name: firstName,
            last_name: lastName,
            firstName,
            lastName,
            name_sharing_consent: true,
            name_sharing_consent_at: consentAt,
          },
        })

        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: {   
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
            },
            body: JSON.stringify({
              id: user.id,
              firstName,
              lastName,
              email,
              nameSharingConsent: true,
              nameSharingConsentAt: consentAt,
            }),
          })
        } catch (apiErr) {
          console.error('Failed to create user record in users_table:', apiErr)
        }
      }

      try {
        localStorage.setItem(
          'subtle-user-v1',
          JSON.stringify({
            firstName: (meta.first_name ?? meta.firstName ?? firstName).trim(),
            lastName: (meta.last_name ?? meta.lastName ?? lastName).trim(),
            email,
          }),
        )
      } catch {}

      router.replace('/home')
      router.refresh()
    }

    

    run().catch((e) => {
      console.error('Auth callback failed:', e)
      fail(e?.message ?? 'Something went wrong. Please try again.')
    })
  }, [router, searchParams])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'sans-serif' }}>
      <p role={error ? 'alert' : 'status'}>{error || 'Signing you in…'}</p>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  )
}