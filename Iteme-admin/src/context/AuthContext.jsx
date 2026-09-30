import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
      })
      .catch((err) => {
        console.error('Could not load auth session:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('profile fetch failed:', error)
        setProfile(data)
        setProfileLoading(false)
      })
  }, [session])

  async function refreshProfile() {
    if (!session?.user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    setProfile(data)
  }

  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const role = profile?.role
  const isTeacher = role === 'teacher'
  const isAccountant = role === 'accountant'
  const isAdmin = role === 'admin'
  const isFinance = isAdmin || isAccountant
  const isStaff = isTeacher || isAccountant || isAdmin

  const value = {
    user: session?.user ?? null,
    profile,
    loading: loading || profileLoading,
    isStaff,
    isTeacher,
    isAccountant,
    isAdmin,
    isFinance,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
