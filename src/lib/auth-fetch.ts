'use client'

import { supabase } from './supabase'

/**
 * fetch() for our own /api routes that sends the signed-in user's login token, so the server can
 * act as that user (Supabase access rules then decide what they may read or change).
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  return fetch(input, { ...init, headers })
}
