'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [isError, setIsError] = useState<boolean>(false)
  const router = useRouter()

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

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', border: '1px solid #eaeaea', borderRadius: '8px' }}>
      <h2>Subtle Authentication</h2>
      {message && (
        <p style={{ color: isError ? 'red' : 'green', fontSize: '0.9rem' }}>
          {message}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        <input 
          type="email" 
          placeholder="Email address" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.5rem' }}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '0.5rem' }}
        />
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            disabled={loading} 
            onClick={() => handleAuth(false)}
            style={{ flex: 1, padding: '0.5rem' }}
          >
            Log In
          </button>
          <button 
            disabled={loading} 
            onClick={() => handleAuth(true)}
            style={{ flex: 1, padding: '0.5rem' }}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  )
}