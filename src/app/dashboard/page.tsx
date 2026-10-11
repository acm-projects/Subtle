'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import Login from '../../components/login'

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [tableData, setTableData] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState<boolean>(false)

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) fetchUserData(session)
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      if (session) fetchUserData(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Example function to fetch data from one of your existing tables
  const fetchUserData = async (currentSession: Session) => {
    setDataLoading(true)
    // Replace 'your_table_name' with an actual table name from your Supabase setup
    const { data, error } = await supabase
      .from('your_table_name')
      .select('*')
      
    if (error) {
      console.error('Error fetching table data:', error.message)
    } else {
      setTableData(data || [])
    }
    setDataLoading(false)
  }

  if (loading) {
    return <p style={{ textAlign: 'center', marginTop: '4rem' }}>Loading session...</p>
  }

  if (!session) {
    return <Login />
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <h1>Subtle Dashboard</h1>
      <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', margin: '1rem 0' }}>
        <p><strong>User ID:</strong> {session.user.id}</p>
        <p><strong>Email:</strong> {session.user.email}</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          style={{ marginTop: '0.5rem', padding: '0.4rem 1rem', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Log Out
        </button>
      </div>

      <h2>Your Database Records</h2>
      {dataLoading ? (
        <p>Loading table data...</p>
      ) : (
        <pre style={{ background: '#1e1e1e', color: '#dcdcdc', padding: '1rem', borderRadius: '6px', overflowX: 'auto' }}>
          {tableData.length > 0 ? JSON.stringify(tableData, null, 2) : 'No records found or RLS policy restricts view.'}
        </pre>
      )}
    </div>
  )
}