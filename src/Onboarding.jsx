import React, { useState } from 'react'
import { supabase } from './supabase.js'

const C = {
  bg: '#0F1117', card: '#1A1D27', border: '#2A2D3E',
  accent: '#7C6FCD', text: '#E8EAF0', muted: '#8B8FA8',
  green: '#3ECF8E', red: '#E05252', gold: '#F5A623',
}

export default function Onboarding({ user, onComplete }) {
  const urlToken = new URLSearchParams(window.location.search).get('invite') || ''
  const [mode, setMode] = useState(urlToken ? 'join' : null)
  const [stallName, setStallName] = useState('')
  const [token, setToken] = useState(urlToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function createStable(e) {
    e.preventDefault()
    if (!stallName.trim()) return
    setLoading(true); setError(null)
    const { data: stable, error: se } = await supabase
      .from('stables')
      .insert({ name: stallName.trim(), owner_id: user.id })
      .select().single()
    if (se) { setError(se.message); setLoading(false); return }
    await supabase.from('profiles').update({
      stable_id: stable.id, role: 'admin',
      name: user.email,
    }).eq('id', user.id)
    onComplete(stable.id, 'admin')
  }

  async function joinStable(e) {
    e.preventDefault()
    if (!token.trim()) return
    setLoading(true); setError(null)
    const { data: invite, error: ie } = await supabase
      .from('stable_invites')
      .select('*')
      .eq('token', token.trim())
      .is('used_at', null)
      .single()
    if (ie || !invite) { setError('Einladungslink ungültig oder bereits verwendet.'); setLoading(false); return }
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setError('Einladungslink abgelaufen.'); setLoading(false); return
    }
    await supabase.from('profiles').update({ stable_id: invite.stable_id, role: 'member' }).eq('id', user.id)
    await supabase.from('stable_invites').update({ used_at: new Date().toISOString(), used_by: user.id }).eq('id', invite.id)
    onComplete(invite.stable_id, 'member')
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🐴</div>
          <h1 style={{ color: C.text, fontSize: 24, fontWeight: 700, margin: 0 }}>Willkommen!</h1>
          <p style={{ color: C.muted, marginTop: 8 }}>Richte deinen Stall ein oder tritt einem bestehenden bei.</p>
        </div>

        {!mode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button onClick={() => setMode('create')} style={{
              background: C.card, border: `2px solid ${C.accent}`, borderRadius: 16,
              padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: C.text,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Neuen Stall anlegen</div>
              <div style={{ fontSize: 13, color: C.muted }}>Du bist der Admin und kannst andere einladen.</div>
            </button>
            <button onClick={() => setMode('join')} style={{
              background: C.card, border: `2px solid ${C.border}`, borderRadius: 16,
              padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: C.text,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Einladungslink eingeben</div>
              <div style={{ fontSize: 13, color: C.muted }}>Du hast einen Link von deinem Stall-Admin erhalten.</div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Zurück</button>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Stall anlegen</h2>
            <form onSubmit={createStable}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Name deines Stalls *</label>
              <input type="text" value={stallName} onChange={e => setStallName(e.target.value)} required
                placeholder="z.B. Reitanlage Müller"
                style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 15, marginBottom: 20, boxSizing: 'border-box' }} />
              {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading || !stallName.trim()} style={{
                width: '100%', padding: '12px', background: C.accent, color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Wird angelegt...' : 'Stall anlegen & loslegen'}
              </button>
            </form>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
            <button onClick={() => setMode(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>← Zurück</button>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Stall beitreten</h2>
            <form onSubmit={joinStable}>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Einladungscode *</label>
              <input type="text" value={token} onChange={e => setToken(e.target.value)} required
                placeholder="z.B. a1b2c3d4e5f6..."
                style={{ width: '100%', padding: '10px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, marginBottom: 20, boxSizing: 'border-box', fontFamily: 'monospace' }} />
              {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button type="submit" disabled={loading || !token.trim()} style={{
                width: '100%', padding: '12px', background: C.accent, color: '#fff',
                border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? 'Wird geprüft...' : 'Stall beitreten'}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 24 }}>
          Eingeloggt als {user.email}
        </p>
      </div>
    </div>
  )
}
