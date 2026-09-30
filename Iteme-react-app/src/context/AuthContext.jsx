import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authSheet, setAuthSheet] = useState(null) // null | 'login' | 'signup'
  const [applyProgramId, setApplyProgramId] = useState(null)
  const [detailProgramId, setDetailProgramId] = useState(null)
  const pendingApplyProgramIdRef = useRef(null)

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
      if (newSession?.user) {
        setAuthSheet(null)
        if (pendingApplyProgramIdRef.current) {
          setApplyProgramId(pendingApplyProgramIdRef.current)
          pendingApplyProgramIdRef.current = null
        }
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
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

  async function signUp({ email, password, fullName, phone, idPassport, residence, educationLevel, bio }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
          id_passport: idPassport || null,
          residence: residence || null,
          education_level: educationLevel || null,
          bio: bio || null,
        },
      },
    })

    if (error) throw error

    return data
  }

  async function signIn({ identifier, password }) {
    const { data, error } = await supabase.functions.invoke('login-with-identifier', {
      body: { identifier, password },
    })

    if (error || data?.error || !data?.access_token) {
      throw new Error('Invalid login credentials')
    }

    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })

    if (setSessionError) throw setSessionError
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function requestApply(programId) {
    if (session?.user) {
      setApplyProgramId(programId)
    } else {
      pendingApplyProgramIdRef.current = programId
      setAuthSheet('signup')
    }
  }

  const value = {
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    authSheet,
    openLogin: () => setAuthSheet('login'),
    openSignup: () => setAuthSheet('signup'),
    closeAuthSheet: () => setAuthSheet(null),
    applyProgramId,
    requestApply,
    closeApply: () => setApplyProgramId(null),
    detailProgramId,
    openProgramDetail: (programId) => setDetailProgramId(programId),
    closeProgramDetail: () => setDetailProgramId(null),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
