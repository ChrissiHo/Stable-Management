import React, { useState, useEffect } from 'react'
import { supabase } from './supabase.js'

const C = {
  navy: '#E8EAF0',
  gold: '#F5A623',
  accent: '#7C6FCD',
  bg: '#0F1117',
  white: '#1A1D27',
  border: '#2A2D3E',
  muted: '#8B8FA8',
  error: '#E05252',
  success: '#3ECF8E',
}

const CATEGORIES = ['Tierarzt', 'Hufschmied', 'Impfung', 'Wurmkur', 'Physio', 'Chiro', 'Osteo',
  'Futter', 'Zusatzfutter', 'Einstreu', 'Nenngebühr', 'Turnier', 'Boxenmiete', 'Stallmiete', 'Versicherung', 'Sonstiges']

const ALL_SECTIONS = [
  { id: 'notifications', label: 'Benachrichtigungen', icon: '🔔' },
  { id: 'horses', label: 'Pferde', icon: '🐴' },
  { id: 'training', label: 'Trainingsplan', icon: '🏋' },
  { id: 'calendar', label: 'Termine', icon: '📅' },
  { id: 'tournamentplan', label: 'Turnierplanung', icon: '📋' },
  { id: 'tournaments', label: 'Turnierergebnisse', icon: '🏆' },
  { id: 'feeding', label: 'Futterplan', icon: '🌾' },
  { id: 'health', label: 'Gesundheit', icon: '💉' },
  { id: 'costs', label: 'Kosten', icon: '💰' },
]

export default function AdminPanel({ horses }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [accessMap, setAccessMap] = useState({})
  const [permsMap, setPermsMap] = useState({}) // userId -> Set of allowed section ids (null = all)
  const [editingPerms, setEditingPerms] = useState(null) // { userId, sections: Set }
  const [recurringCosts, setRecurringCosts] = useState([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteMsg, setInviteMsg] = useState(null)
  const [editingUser, setEditingUser] = useState(null) // { id, kuerzel }
  const [loading, setLoading] = useState(true)
  // New recurring cost form
  const [rcHorse, setRcHorse] = useState('')
  const [rcCategory, setRcCategory] = useState(CATEGORIES[0])
  const [rcAmount, setRcAmount] = useState('')
  const [rcNote, setRcNote] = useState('')
  const [rcMsg, setRcMsg] = useState(null)
  const [editingRc, setEditingRc] = useState(null) // { id, horse_id, category, amount, note }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [profilesRes, accessRes, rcRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('horse_access').select('*'),
      supabase.from('recurring_costs').select('*').eq('active', true),
    ])
    const map = {}
    accessRes.data?.forEach(a => {
      if (!map[a.user_id]) map[a.user_id] = new Set()
      map[a.user_id].add(a.horse_id)
    })
    const pm = {}
    profilesRes.data?.forEach(p => {
      pm[p.id] = p.allowed_sections ? new Set(p.allowed_sections) : null
    })
    setUsers(profilesRes.data || [])
    setAccessMap(map)
    setPermsMap(pm)
    setRecurringCosts(rcRes.data || [])
    setLoading(false)
  }

  async function toggleAccess(userId, horseId, currentlyHas) {
    if (currentlyHas) {
      await supabase.from('horse_access').delete().eq('user_id', userId).eq('horse_id', horseId)
    } else {
      await supabase.from('horse_access').insert({ user_id: userId, horse_id: horseId })
    }
    setAccessMap(prev => {
      const next = { ...prev }
      if (!next[userId]) next[userId] = new Set()
      else next[userId] = new Set(next[userId])
      if (currentlyHas) next[userId].delete(horseId)
      else next[userId].add(horseId)
      return next
    })
  }

  async function inviteUser(e) {
    e.preventDefault()
    setInviteMsg(null)
    const kuerzel = ((inviteFirstName.charAt(0) || '') + (inviteLastName.charAt(0) || '')).toUpperCase()
    const { error } = await supabase.auth.resetPasswordForEmail(inviteEmail, {
      redirectTo: window.location.origin,
    })
    if (error) { setInviteMsg({ type: 'error', text: error.message }); return }
    // Try to update profile if it already exists
    await supabase.from('profiles').upsert({ email: inviteEmail, first_name: inviteFirstName, last_name: inviteLastName, kuerzel, name: `${inviteFirstName} ${inviteLastName}`.trim() }, { onConflict: 'email' })
    setInviteMsg({ type: 'success', text: `Email an ${inviteEmail} gesendet.` })
    setInviteEmail(''); setInviteFirstName(''); setInviteLastName('')
    loadAll()
  }

  async function savePerms() {
    if (!editingPerms) return
    const { userId, sections } = editingPerms
    const allowed = sections === null ? null : [...sections]
    await supabase.from('profiles').update({ allowed_sections: allowed }).eq('id', userId)
    setPermsMap(prev => ({ ...prev, [userId]: sections }))
    setEditingPerms(null)
  }

  async function saveUserKuerzel() {
    if (!editingUser) return
    await supabase.from('profiles').update({ kuerzel: editingUser.kuerzel }).eq('id', editingUser.id)
    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, kuerzel: editingUser.kuerzel } : u))
    setEditingUser(null)
  }

  async function addRecurringCost(e) {
    e.preventDefault()
    setRcMsg(null)
    if (!rcHorse) { setRcMsg({ type: 'error', text: 'Bitte ein Pferd auswählen.' }); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('recurring_costs').insert({
      horse_id: parseInt(rcHorse),
      category: rcCategory,
      amount: parseFloat(rcAmount),
      note: rcNote,
      active: true,
      created_by: user.id,
    })
    if (error) { setRcMsg({ type: 'error', text: error.message }); return }
    setRcMsg({ type: 'success', text: 'Wiederkehrende Kosten gespeichert.' })
    setRcHorse(''); setRcAmount(''); setRcNote('')
    loadAll()
  }

  async function saveEditedRecurring(e) {
    e.preventDefault()
    const { error } = await supabase.from('recurring_costs').update({
      horse_id: parseInt(editingRc.horse_id),
      category: editingRc.category,
      amount: parseFloat(editingRc.amount),
      note: editingRc.note,
    }).eq('id', editingRc.id)
    if (error) { setRcMsg({ type: 'error', text: error.message }); return }
    setRecurringCosts(prev => prev.map(r => r.id === editingRc.id ? { ...r, ...editingRc, amount: parseFloat(editingRc.amount) } : r))
    setEditingRc(null)
    setRcMsg({ type: 'success', text: 'Gespeichert.' })
  }

  async function deactivateRecurring(id) {
    await supabase.from('recurring_costs').update({ active: false }).eq('id', id)
    setRecurringCosts(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Lade...</div>

  const owners = users.filter(u => u.role !== 'admin')

  const tabStyle = (active) => ({
    padding: '8px 20px', border: 'none', borderRadius: 8, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
    background: active ? C.accent : 'transparent',
    color: active ? '#fff' : C.muted,
  })

  const cardStyle = {
    background: C.white, border: `1.5px solid ${C.border}`,
    borderRadius: 12, padding: 24, marginBottom: 24,
  }

  return (
    <div style={{ padding: '24px 0', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ color: C.navy, fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
        ⚙️ Admin-Panel
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle(tab === 'users')} onClick={() => setTab('users')}>👥 Nutzerverwaltung</button>
        <button style={tabStyle(tab === 'recurring')} onClick={() => setTab('recurring')}>🔁 Wiederkehrende Kosten</button>
      </div>

      {/* ── TAB: Nutzerverwaltung ── */}
      {tab === 'users' && <>
        <div style={cardStyle}>
          <h3 style={{ color: C.navy, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Neuen Besitzer einladen</h3>
          <form onSubmit={inviteUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Vorname *</label>
              <input type="text" value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} required placeholder="Max"
                style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', background: C.bg, color: C.navy, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Nachname *</label>
              <input type="text" value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} required placeholder="Mustermann"
                style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', background: C.bg, color: C.navy, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>E-Mail *</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required placeholder="max@example.com"
                style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, width: '100%', background: C.bg, color: C.navy, boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" style={{ padding: '8px 20px', background: C.gold, color: '#1A1D27', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                Einladen
              </button>
            </div>
          </form>
          {inviteFirstName && inviteLastName && <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Kürzel wird automatisch: <strong style={{ color: C.navy }}>{(inviteFirstName.charAt(0) + inviteLastName.charAt(0)).toUpperCase()}</strong></p>}
          {inviteMsg && <p style={{ marginTop: 10, fontSize: 13, color: inviteMsg.type === 'error' ? C.error : C.success }}>{inviteMsg.text}</p>}
          <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Hinweis: Nutzer müssen in Supabase → Authentication manuell angelegt werden.</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: C.navy, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Pferde-Freigaben</h3>
          {owners.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 14 }}>Noch keine Besitzer angelegt.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: C.navy, fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>Besitzer / Mitarbeiter</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: C.navy, fontWeight: 700, borderBottom: `2px solid ${C.border}`, fontSize: 12 }}>Kürzel</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: C.navy, fontWeight: 700, borderBottom: `2px solid ${C.border}`, fontSize: 12 }}>Bereiche</th>
                    {horses.map(h => (
                      <th key={h.id} style={{ textAlign: 'center', padding: '8px 6px', color: C.navy, fontWeight: 600, borderBottom: `2px solid ${C.border}`, fontSize: 11 }}>
                        {h.emoji || '🐴'}<br />{h.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map(user => (
                    <tr key={user.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', color: C.navy }}>
                        <div style={{ fontWeight: 600 }}>{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.name || '–'}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {editingUser?.id === user.id ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            <input value={editingUser.kuerzel} onChange={e => setEditingUser(p => ({ ...p, kuerzel: e.target.value.toUpperCase().slice(0, 3) }))}
                              style={{ width: 44, padding: '4px 6px', background: C.bg, border: `1.5px solid ${C.accent}`, borderRadius: 6, color: C.navy, fontSize: 13, fontWeight: 700, textAlign: 'center' }} />
                            <button onClick={saveUserKuerzel} style={{ padding: '4px 8px', background: C.success, border: 'none', borderRadius: 6, color: '#1A1D27', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✓</button>
                            <button onClick={() => setEditingUser(null)} style={{ padding: '4px 6px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingUser({ id: user.id, kuerzel: user.kuerzel || ((user.first_name || '').charAt(0) + (user.last_name || '').charAt(0)).toUpperCase() || user.name?.substring(0, 2).toUpperCase() || '' })}
                            style={{ fontWeight: 700, fontSize: 13, color: C.accent, background: 'rgba(124,111,205,0.15)', border: `1px solid ${C.accent}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', minWidth: 36 }}>
                            {user.kuerzel || ((user.first_name || '').charAt(0) + (user.last_name || '').charAt(0)).toUpperCase() || user.name?.substring(0, 2).toUpperCase() || '?'}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                        {editingPerms?.userId === user.id ? (
                          <div style={{ minWidth: 220 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.muted, cursor: 'pointer', width: '100%', fontStyle: 'italic' }}>
                                <input type="checkbox"
                                  checked={editingPerms.sections === null}
                                  onChange={e => setEditingPerms(p => ({ ...p, sections: e.target.checked ? null : new Set(ALL_SECTIONS.map(s => s.id)) }))} />
                                Alle Bereiche (Standard)
                              </label>
                              {editingPerms.sections !== null && ALL_SECTIONS.map(s => (
                                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.navy, cursor: 'pointer' }}>
                                  <input type="checkbox"
                                    checked={editingPerms.sections.has(s.id)}
                                    onChange={e => {
                                      const next = new Set(editingPerms.sections)
                                      if (e.target.checked) next.add(s.id); else next.delete(s.id)
                                      setEditingPerms(p => ({ ...p, sections: next }))
                                    }} />
                                  {s.icon} {s.label}
                                </label>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={savePerms} style={{ padding: '4px 10px', background: C.success, border: 'none', borderRadius: 6, color: '#1A1D27', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>✓ Speichern</button>
                              <button onClick={() => setEditingPerms(null)} style={{ padding: '4px 8px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: permsMap[user.id] === null ? C.muted : C.accent }}>
                              {permsMap[user.id] === null ? 'Alle' : [...(permsMap[user.id] || new Set())].map(id => ALL_SECTIONS.find(s => s.id === id)?.icon || id).join(' ')}
                            </span>
                            <button onClick={() => setEditingPerms({ userId: user.id, sections: permsMap[user.id] === null ? null : new Set(permsMap[user.id] || ALL_SECTIONS.map(s => s.id)) })}
                              style={{ padding: '2px 8px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer', fontSize: 11 }}>
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      {horses.map(h => {
                        const has = accessMap[user.id]?.has(h.id) || false
                        return (
                          <td key={h.id} style={{ textAlign: 'center', padding: '10px 6px' }}>
                            <button onClick={() => toggleAccess(user.id, h.id, has)}
                              style={{ width: 32, height: 32, borderRadius: 6, border: `1.5px solid ${has ? C.gold : C.border}`, background: has ? C.gold : 'transparent', color: has ? '#1A1D27' : C.muted, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                              {has ? '✓' : ''}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>}

      {/* ── TAB: Wiederkehrende Kosten ── */}
      {tab === 'recurring' && <>
        <div style={cardStyle}>
          <h3 style={{ color: C.navy, fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Neue wiederkehrende Kosten</h3>
          <form onSubmit={addRecurringCost}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Pferd *</label>
                <select value={rcHorse} onChange={e => setRcHorse(e.target.value)} required
                  style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.bg, color: C.navy, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">-- wählen --</option>
                  {horses.map(h => <option key={h.id} value={h.id}>{h.emoji || '🐴'} {h.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Kategorie</label>
                <select value={rcCategory} onChange={e => setRcCategory(e.target.value)}
                  style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.bg, color: C.navy, width: '100%', boxSizing: 'border-box' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Betrag (€) *</label>
                <input type="number" value={rcAmount} onChange={e => setRcAmount(e.target.value)} required min="0" step="0.01"
                  placeholder="0.00"
                  style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.bg, color: C.navy, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4 }}>Beschreibung</label>
                <input type="text" value={rcNote} onChange={e => setRcNote(e.target.value)}
                  placeholder="z.B. Boxenmiete"
                  style={{ padding: '8px 12px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, background: C.bg, color: C.navy, width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button type="submit" style={{ padding: '8px 24px', background: C.gold, color: '#1A1D27', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              + Hinzufügen
            </button>
            {rcMsg && <p style={{ marginTop: 10, fontSize: 13, color: rcMsg.type === 'error' ? C.error : C.success }}>{rcMsg.text}</p>}
          </form>
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: C.navy, fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Aktive wiederkehrende Kosten</h3>
          <p style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>Werden automatisch beim ersten App-Aufruf im neuen Monat eingetragen.</p>
          {recurringCosts.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 14 }}>Noch keine wiederkehrenden Kosten definiert.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 420 }}>
              <thead>
                <tr>
                  {['Pferd', 'Kategorie', 'Betrag', 'Beschreibung', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recurringCosts.map(r => {
                  const horse = horses.find(h => h.id === r.horse_id)
                  const isEditing = editingRc?.id === r.id
                  if (isEditing) return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(124,111,205,0.08)' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <select value={editingRc.horse_id} onChange={e => setEditingRc(p => ({ ...p, horse_id: e.target.value }))}
                          style={{ padding: '6px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: C.bg, color: C.navy, width: '100%' }}>
                          {horses.map(h => <option key={h.id} value={h.id}>{h.emoji || '🐴'} {h.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <select value={editingRc.category} onChange={e => setEditingRc(p => ({ ...p, category: e.target.value }))}
                          style={{ padding: '6px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: C.bg, color: C.navy, width: '100%' }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="number" value={editingRc.amount} onChange={e => setEditingRc(p => ({ ...p, amount: e.target.value }))} min="0" step="0.01"
                          style={{ padding: '6px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: C.bg, color: C.navy, width: 80 }} />
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <input type="text" value={editingRc.note} onChange={e => setEditingRc(p => ({ ...p, note: e.target.value }))}
                          style={{ padding: '6px 8px', border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 13, background: C.bg, color: C.navy, width: '100%' }} />
                      </td>
                      <td style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                        <button onClick={saveEditedRecurring}
                          style={{ padding: '4px 10px', background: C.success, border: 'none', borderRadius: 6, color: '#1A1D27', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ✓
                        </button>
                        <button onClick={() => setEditingRc(null)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, fontSize: 12, cursor: 'pointer' }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', color: C.navy }}>{horse ? `${horse.emoji || '🐴'} ${horse.name}` : '–'}</td>
                      <td style={{ padding: '10px 12px', color: C.navy }}>{r.category}</td>
                      <td style={{ padding: '10px 12px', color: C.gold, fontWeight: 700 }}>{Number(r.amount).toFixed(2)} €</td>
                      <td style={{ padding: '10px 12px', color: C.muted }}>{r.note || '–'}</td>
                      <td style={{ padding: '10px 12px', display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditingRc({ id: r.id, horse_id: r.horse_id, category: r.category, amount: r.amount, note: r.note || '' })}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.accent}`, borderRadius: 6, color: C.accent, fontSize: 12, cursor: 'pointer' }}>
                          Bearbeiten
                        </button>
                        <button onClick={() => deactivateRecurring(r.id)}
                          style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.error}`, borderRadius: 6, color: C.error, fontSize: 12, cursor: 'pointer' }}>
                          Entfernen
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </>}
    </div>
  )
}
