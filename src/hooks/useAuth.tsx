import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { AuthUser, User } from '../types'

interface AuthCtx {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  updateLastSeen: () => void
}

const Ctx = createContext<AuthCtx>({
  user: null, loading: true,
  signIn: async () => null,
  signOut: async () => {},
  updateLastSeen: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (authId: string, email: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authId)
      .single()
    if (error || !data) return null
    return { id: authId, email, profile: data as User }
  }, [])

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email!)
        setUser(profile)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email!)
        setUser(profile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateLastSeen = useCallback(() => {
    if (!user) return
    supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
  }, [user])

  // Ping last_seen every 5 minutes
  useEffect(() => {
    if (!user) return
    updateLastSeen()
    const t = setInterval(updateLastSeen, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [user, updateLastSeen])

  return (
    <Ctx.Provider value={{ user, loading, signIn, signOut, updateLastSeen }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
