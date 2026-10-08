
/*'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar' 
import './login.css'

const icon = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function passwordStrength(pw: string): number {
  if (pw.length === 0) return 0
  if (pw.length < 8) return 1
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  return kinds >= 3 && pw.length >= 12 ? 3 : 2
}

export default function Login() {
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [agreed, setAgreed] = useState<boolean>(false) // visual only, not used by the auth logic
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [isError, setIsError] = useState<boolean>(false)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const router = useRouter()

  const isSignUpMode = mode === 'signup'
  const strength = passwordStrength(password)

  const switchMode = (next: 'signup' | 'login') => {
    setMode(next)
    setMessage('')
    setIsError(false)
  }

  // Same Supabase logic as your original login.tsx, unchanged
  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true)
    setMessage('')
    setIsError(false)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        setMessage('Success! Check your email for the confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAuth(isSignUpMode)
  }

  return (
    <div className="sb-auth">
      {/* ---------- Header ---------- }
      <header className="sb-nav">
        <div className="sb-nav-left">
          <Link href="/" className="sb-home" aria-label="Home">
            <svg {...icon} width={22} height={22} strokeWidth={1.6}>
              <path d="M3 11.5 12 4l9 7.5" />
              <path d="M5.5 10v9.5h13V10" />
              <path d="M10 19.5v-5h4v5" />
            </svg>
          </Link>
          <Link href="/" className="sb-logo">subtle.</Link>
        </div>

        <nav className="sb-nav-links" aria-label="Main">
          <a href="#how-it-works">How It Works</a>
          <a href="#cities">Browse Cities</a>
        </nav>

        <div className="sb-nav-right">
          <button
            type="button"
            className={isSignUpMode ? 'sb-pill' : 'sb-textbtn'}
            aria-pressed={isSignUpMode}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={isSignUpMode ? 'sb-textbtn' : 'sb-pill'}
            aria-pressed={!isSignUpMode}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
        </div>
      </header>

      {/* ---------- Headline + card ---------- }
      <div className="sb-body">
        <div className="sb-center">
          <div className="sb-headline">
            {isSignUpMode ? (
              <>
                <h1>create your account<span className="sb-dot">.</span></h1>
                <p>Join <em>4,500+</em> verified students and tech interns booking safely.</p>
              </>
            ) : (
              <>
                <h1>welcome back<span className="sb-dot">.</span></h1>
                <p>Log in to pick up where you left off.</p>
              </>
            )}
          </div>

          <form className="sb-card" onSubmit={handleSubmit} noValidate>
            {isSignUpMode && (
              <div className="sb-row">
                <div className="sb-field">
                  <div className="sb-label-row">
                    <label className="sb-label" htmlFor="first-name">First name <span className="sb-req">*</span></label>
                  </div>
                  <div className="sb-input">
                    <input id="first-name" placeholder="Alex" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                </div>
                <div className="sb-field">
                  <div className="sb-label-row">
                    <label className="sb-label" htmlFor="last-name">Last name <span className="sb-req">*</span></label>
                  </div>
                  <div className="sb-input">
                    <input id="last-name" placeholder="Chen" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="sb-field">
              <div className="sb-label-row">
                <label className="sb-label" htmlFor="email">
                  {isSignUpMode ? 'Student email' : 'Email'} <span className="sb-req">*</span>
                </label>
                {isSignUpMode && (
                  <span className="sb-badge">
                    <svg {...icon} width={13} height={13}>
                      <path d="m2 9 10-5 10 5-10 5z" />
                      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                    </svg>
                    .edu only
                  </span>
                )}
              </div>
              <div className="sb-input">
                <svg {...icon}>
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="alex.chen@stanford.edu"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="sb-field">
              <div className="sb-label-row">
                <label className="sb-label" htmlFor="password">Password <span className="sb-req">*</span></label>
              </div>
              <div className="sb-input">
                <svg {...icon}>
                  <rect x="5" y="11" width="14" height="9" rx="2.5" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="sb-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg {...icon}>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </div>
              {isSignUpMode && (
                <div className="sb-strength" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={strength >= n ? 'sb-on' : ''} />
                  ))}
                </div>
              )}
            </div>

            {message && (
              <p className={`sb-message ${isError ? 'sb-error' : 'sb-ok'}`} role={isError ? 'alert' : 'status'}>
                {message}
              </p>
            )}

            <button className="sb-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : isSignUpMode ? 'Create Account' : 'Log In'}
              {!loading && (
                <svg {...icon} width={16} height={16} strokeWidth={2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>

            <div className="sb-card-foot">
              {isSignUpMode ? 'Already have an account?' : 'New to subtle?'}
              <button type="button" className="sb-linkbtn" onClick={() => switchMode(isSignUpMode ? 'login' : 'signup')}>
                {isSignUpMode ? 'Log in here' : 'Create an account'}
              </button>
            </div>
          </form>

          <div className="sb-or" aria-hidden="true"><span>or</span></div>

          <button type="button" className="sb-google">
            <span className="sb-google-g">
              <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
            </span>
            {isSignUpMode ? 'Sign up with Google account' : 'Sign in with Google account'}
          </button>
        </div>
      </div>

      
    </div>
  )
}


*/ 

'use client'

import { Suspense, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Navbar from '../../components/Navbar'
import './login.css'

const icon = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function passwordStrength(pw: string): number {
  if (pw.length === 0) return 0
  if (pw.length < 8) return 1
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  return kinds >= 3 && pw.length >= 12 ? 3 : 2
}

function LoginForm() {
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [isError, setIsError] = useState<boolean>(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const mode: 'signup' | 'login' = searchParams.get('mode') === 'login' ? 'login' : 'signup'
  const isSignUpMode = mode === 'signup'
  const strength = passwordStrength(password)

  const switchMode = (next: 'signup' | 'login') => {
    setMessage('')
    setIsError(false)
    router.replace(`${pathname}?mode=${next}`, { scroll: false })
  }

  const handleAuth = async (isSignUp: boolean) => {
    setLoading(true)
    setMessage('')
    setIsError(false)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        setMessage('Success! Check your email for the confirmation link.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setIsError(true)
        setMessage(error.message)
      } else {
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAuth(isSignUpMode)
  }

  return (
    <div className="sb-auth">
      <Navbar />

      <div className="sb-body">
        <div className="sb-center">
          <div className="sb-headline">
            {isSignUpMode ? (
              <>
                <h1>create your account<span className="sb-dot">.</span></h1>
                <p>Join <em>4,500+</em> verified students and tech interns booking safely.</p>
              </>
            ) : (
              <>
                <h1>welcome back<span className="sb-dot">.</span></h1>
                <p>Log in to pick up where you left off.</p>
              </>
            )}
          </div>

          <form className="sb-card" onSubmit={handleSubmit} noValidate>
            {isSignUpMode && (
              <div className="sb-row">
                <div className="sb-field">
                  <div className="sb-label-row">
                    <label className="sb-label" htmlFor="first-name">First name <span className="sb-req">*</span></label>
                  </div>
                  <div className="sb-input">
                    <input id="first-name" placeholder="Alex" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                </div>
                <div className="sb-field">
                  <div className="sb-label-row">
                    <label className="sb-label" htmlFor="last-name">Last name <span className="sb-req">*</span></label>
                  </div>
                  <div className="sb-input">
                    <input id="last-name" placeholder="Chen" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="sb-field">
              <div className="sb-label-row">
                <label className="sb-label" htmlFor="email">
                  {isSignUpMode ? 'Student email' : 'Email'} <span className="sb-req">*</span>
                </label>
                {isSignUpMode && (
                  <span className="sb-badge">
                    <svg {...icon} width={13} height={13}>
                      <path d="m2 9 10-5 10 5-10 5z" />
                      <path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
                    </svg>
                    .edu only
                  </span>
                )}
              </div>
              <div className="sb-input">
                <svg {...icon}>
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="alex.chen@stanford.edu"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="sb-field">
              <div className="sb-label-row">
                <label className="sb-label" htmlFor="password">Password <span className="sb-req">*</span></label>
              </div>
              <div className="sb-input">
                <svg {...icon}>
                  <rect x="5" y="11" width="14" height="9" rx="2.5" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete={isSignUpMode ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="sb-eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg {...icon}>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                    {showPassword && <path d="M4 4l16 16" />}
                  </svg>
                </button>
              </div>
              {isSignUpMode && (
                <div className="sb-strength" aria-hidden="true">
                  {[1, 2, 3].map((n) => (
                    <span key={n} className={strength >= n ? 'sb-on' : ''} />
                  ))}
                </div>
              )}
            </div>

            {message && (
              <p className={`sb-message ${isError ? 'sb-error' : 'sb-ok'}`} role={isError ? 'alert' : 'status'}>
                {message}
              </p>
            )}

            <button className="sb-submit" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : isSignUpMode ? 'Create Account' : 'Log In'}
              {!loading && (
                <svg {...icon} width={16} height={16} strokeWidth={2}>
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>

            <div className="sb-card-foot">
              {isSignUpMode ? 'Already have an account?' : 'New to subtle?'}
              <button type="button" className="sb-linkbtn" onClick={() => switchMode(isSignUpMode ? 'login' : 'signup')}>
                {isSignUpMode ? 'Log in here' : 'Create an account'}
              </button>
            </div>
          </form>

          <div className="sb-or" aria-hidden="true"><span>or</span></div>

          <button type="button" className="sb-google">
            <span className="sb-google-g">
              <svg viewBox="0 0 48 48" width="16" height="16" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
            </span>
            {isSignUpMode ? 'Sign up with Google account' : 'Sign in with Google account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}