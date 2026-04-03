import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'
import { authAPI } from '../services/api'
import { connectSocket, disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, loading: false }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'LOGOUT':
      return { ...initialState, loading: false }
    default:
      return state
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) { dispatch({ type: 'SET_LOADING', payload: false }); return }
    try {
      const { data } = await authAPI.me()
      const userData = data.data?.user || data.data
      dispatch({ type: 'SET_USER', payload: userData })
      connectSocket(token)
    } catch {
      localStorage.clear()
      dispatch({ type: 'LOGOUT' })
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials)
    const userData = data.data?.user || data.data
    const accessToken = data.data?.accessToken || data.accessToken
    const refreshToken = data.data?.refreshToken || data.refreshToken
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    dispatch({ type: 'SET_USER', payload: userData })
    connectSocket(accessToken)
    return userData
  }

  const signup = async (form) => {
    const { data } = await authAPI.signup(form)
    const userData = data.data?.user || data.data
    const accessToken = data.data?.accessToken || data.accessToken
    const refreshToken = data.data?.refreshToken || data.refreshToken
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    dispatch({ type: 'SET_USER', payload: userData })
    connectSocket(accessToken)
    return userData
  }

  const logout = async () => {
    try { await authAPI.logout() } catch {}
    localStorage.clear()
    disconnectSocket()
    dispatch({ type: 'LOGOUT' })
  }

  const updateUser = (updated) => dispatch({ type: 'SET_USER', payload: { ...state.user, ...updated } })

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout, updateUser, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
