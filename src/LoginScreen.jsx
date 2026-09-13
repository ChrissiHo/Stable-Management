import React, { useState } from 'react'
import { supabase } from './supabase.js'

const C = {
  navyDark: '#0F1117',
  navy: '#1A1D27',
  border: '#2A2D3E',
  accent: '#7C6FCD',
  accentSoft: '#2D2B4E',
  gold: '#F5A623',
  text: '#E8EAF0',
  muted: '#8B8FA8',
  error: '#E05252',
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.navyDark,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: C.navy,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        textAlign: 'center',
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🐴</div>
          <h1 style={{
            color: C.text,
            fontSize: 22,
            fontWeight: 700,
            margin: '0 0 4px',
            letterSpacing: 0.5,
          }}>Stall-Management</h1>
          <p style={{ color: C.accent, fontSize: 13, margin: 0 }}>Deine App für den Stall</p>
        </div>

        <form onSubmit={login} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              E-Mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: C.navyDark,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: C.muted, fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                background: C.navyDark,
                border: `1.5px solid ${C.border}`,
                borderRadius: 8,
                fontSize: 14,
                color: C.text,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <div style={{
              color: C.error,
              fontSize: 13,
              marginBottom: 16,
              padding: '8px 12px',
              background: 'rgba(224,82,82,0.1)',
              borderRadius: 6,
              border: `1px solid rgba(224,82,82,0.3)`,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? C.accentSoft : C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: 0.3,
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
