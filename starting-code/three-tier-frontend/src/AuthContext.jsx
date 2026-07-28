import { createContext, useContext, useEffect, useState } from 'react'
import * as api from './api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'woods-and-tools-token'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState(null)
  // True only while a stored token's validity is still being checked against
  // the backend — lets protected routes wait instead of bouncing to /login
  // before we actually know whether the token is good.
  const [authLoading, setAuthLoading] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))

  useEffect(() => {
    if (!token) {
      setUser(null)
      setAuthLoading(false)
      return
    }
    setAuthLoading(true)
    api
      .me(token)
      .then((u) => {
        setUser(u)
        setAuthLoading(false)
      })
      .catch(() => {
        setToken(null)
        setUser(null)
        setAuthLoading(false)
        localStorage.removeItem(STORAGE_KEY)
      })
  }, [token])

  function applySession({ access_token, user }) {
    localStorage.setItem(STORAGE_KEY, access_token)
    setToken(access_token)
    setUser(user)
    setAuthLoading(false)
  }

  async function login(email, password) {
    const session = await api.login({ email, password })
    applySession(session)
  }

  async function register(email, name, password) {
    const session = await api.register({ email, name, password })
    applySession(session)
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, authLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
