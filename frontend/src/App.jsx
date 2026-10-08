import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import { api, setToken, getToken, upload } from './api.js'
import Logo from './Logo.jsx'

const hue = s => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 360
const Avatar = ({ name }) => <span className="av" style={{ background: `hsl(${hue(name)} 62% 52%)` }}>{name[0].toUpperCase()}</span>
const clock = iso => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const isImg = n => /\.(png|jpe?g|gif|webp)$/i.test(n || '')

function NetworkBg() {
  const pts = [[8,18],[22,62],[35,25],[50,80],[63,15],[78,55],[92,28],[14,88],[70,92],[88,82]]
  const links = [[0,2],[2,4],[4,6],[1,2],[1,3],[3,5],[5,6],[2,5],[3,8],[8,9],[5,9],[7,3],[0,1]]
  return (<svg className="net" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    {links.map(([i, j], k) => <line key={k} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]} />)}
    {pts.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k % 3 === 0 ? 1.1 : 0.7} style={{ animationDelay: k * 0.4 + 's' }} />)}
  </svg>)
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({ username: '', password: '' }), [err, setErr] = useState(''), [show, setShow] = useState(false)
  const submit = async e => { e.preventDefault(); setErr('')
    try { const r = await api('/auth/' + mode, 'POST', f); setToken(r.token); localStorage.setItem('user', r.username); onAuth(r.username) } catch (x) { setErr(x.message) } }
  const swap = m => { setMode(m); setErr('') }
  return (<div className="auth">
    <NetworkBg />
    <div className="brand-top"><Logo size={36} /><span>Connect</span></div>
    <div className="chip c1"><Avatar name="Maya" /><div><b>Maya</b><span>Standup in 5 minutes?</span></div></div>
    <div className="chip c2"><Avatar name="Dev" /><div><b>Dev</b><span>Shipped the new build</span></div></div>
    <div className="chip c3"><Avatar name="Sana" /><div><b>Sana</b><span>Sharing the design file</span></div></div>
    <div className="chip c4"><Avatar name="Leo" /><div><b>Leo</b><span>is typing...</span></div></div>
    <form className="auth-card" onSubmit={submit}>
      <div className="seg" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => swap('login')}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => swap('register')}>Create account</button>
      </div>
      <h1>{mode === 'login' ? 'Good to see you again' : 'Start connecting'}</h1>
      <p className="muted">{mode === 'login' ? 'Sign in to rejoin your rooms and conversations.' : 'Pick a username and jump into the conversation.'}</p>
      <label>Username<input value={f.username} onChange={e => setF({ ...f, username: e.target.value })} autoFocus autoComplete="username" placeholder="e.g. maya" /></label>
      <label>Password<div className="pw"><input type={show ? 'text' : 'password'} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Your password" />
        <button type="button" className="eye" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label>
      {err && <div className="error" role="alert">{err}</div>}
      <button className="primary wide">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
    </form>
    <p className="auth-foot">Live rooms &middot; Direct messages &middot; File sharing</p>
  </div>)
}

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('token') ? localStorage.getItem('user') : null)
  const [rooms, setRooms] = useState([]), [active, setActive] = useState(null), [msgs, setMsgs] = useState({}), [unread, setUnread] = useState({})
  const [online, setOnline] = useState([]), [users, setUsers] = useState([]), [conn, setConn] = useState(false), [typing, setTyping] = useState('')
  const [text, setText] = useState(''), [newRoom, setNewRoom] = useState(''), [error, setError] = useState(''), [edit, setEdit] = useState(null), [busy, setBusy] = useState(false)
  const client = useRef(null), subs = useRef({}), activeRef = useRef(null), tTimer = useRef(null), lastT = useRef(0), end = useRef(null), fileIn = useRef(null)

  const addRoom = r => setRooms(x => x.some(y => y.id === r.id) ? x : [...x, r])
  const onMsg = n => {
    setMsgs(p => { const l = p[n.roomId] || [], i = l.findIndex(x => x.id === n.id)
      return { ...p, [n.roomId]: i >= 0 ? l.map((x, j) => j === i ? n : x) : [...l, n] } })
    if (!n.edited && !n.deleted && n.roomId !== activeRef.current && n.sender !== user) setUnread(u => ({ ...u, [n.roomId]: (u[n.roomId] || 0) + 1 }))
  }
  const title = r => r.dmA ? (r.dmA === user ? r.dmB : r.dmA) : r.name

  useEffect(() => { if (!user) return
    api('/rooms').then(r => { setRooms(r); setActive(a => a ?? r[0]?.id ?? null) }).catch(e => setError(e.message))
    const refreshUsers = () => api('/users').then(setUsers).catch(() => {}); refreshUsers()
    const c = new Client({ brokerURL: (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
      connectHeaders: { Authorization: 'Bearer ' + getToken() }, reconnectDelay: 3000,
      onConnect: () => { subs.current = {}
        c.subscribe('/topic/presence', m => { setOnline(JSON.parse(m.body)); refreshUsers() })
        c.subscribe('/topic/rooms', m => addRoom(JSON.parse(m.body)))
        c.subscribe('/topic/dm.' + user, m => addRoom(JSON.parse(m.body)))
        api('/online').then(setOnline); setConn(true) },
      onWebSocketClose: () => setConn(false), onStompError: () => setConn(false) })
    c.activate(); client.current = c; return () => c.deactivate() }, [user])

  // one live subscription per room so unread counts work for rooms you are not viewing
  useEffect(() => { if (!conn) return
    rooms.forEach(r => { if (!subs.current[r.id]) subs.current[r.id] = client.current.subscribe('/topic/room.' + r.id, m => onMsg(JSON.parse(m.body))) }) }, [conn, rooms])

  useEffect(() => { activeRef.current = active; if (!active) return
    setUnread(u => ({ ...u, [active]: 0 })); setTyping(''); setEdit(null)
    api(`/rooms/${active}/messages`).then(h => setMsgs(p => ({ ...p, [active]: [...h, ...(p[active] || []).filter(n => !h.some(y => y.id === n.id))] }))).catch(e => setError(e.message))
    if (!conn) return
    const s = client.current.subscribe('/topic/typing.' + active, m => { const u = JSON.parse(m.body).user; if (u === user) return
      setTyping(u); clearTimeout(tTimer.current); tTimer.current = setTimeout(() => setTyping(''), 2000) })
    return () => s.unsubscribe() }, [conn, active])

  const list = msgs[active] || []
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [list.length, active])
  if (!user) return <Auth onAuth={setUser} />

  const room = rooms.find(r => r.id === active)
  const guard = fn => async (...a) => { try { setError(''); await fn(...a) } catch (e) { setError(e.message) } }
  const publish = body => client.current.publish({ destination: '/app/chat/' + active, body: JSON.stringify(body) })
  const send = e => { e.preventDefault(); if (!text.trim() || !conn) return; publish({ content: text }); setText('') }
  const onType = e => { setText(e.target.value)
    if (conn && Date.now() - lastT.current > 1000) { lastT.current = Date.now(); client.current.publish({ destination: '/app/typing/' + active }) } }
  const createRoom = guard(async e => { e.preventDefault(); const r = await api('/rooms', 'POST', { name: newRoom }); addRoom(r); setActive(r.id); setNewRoom('') })
  const openDm = guard(async name => { const r = await api('/dm', 'POST', { username: name }); addRoom(r); setActive(r.id) })
  const saveEdit = guard(async e => { e.preventDefault(); await api('/messages/' + edit.id, 'PUT', { content: edit.text }); setEdit(null) })
  const delMsg = guard(async id => { if (confirm('Delete this message?')) await api('/messages/' + id, 'DELETE') })
  const attach = guard(async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return
    if (f.size > 5 * 1024 * 1024) throw new Error('File is larger than 5 MB')
    setBusy(true); try { const r = await upload(f); publish({ content: text, fileUrl: r.url, fileName: r.name }); setText('') } finally { setBusy(false) } })
  const dmRoom = u => rooms.find(r => r.dmA && (r.dmA === u || r.dmB === u))
  const Badge = ({ id }) => unread[id] > 0 ? <span className="badge">{unread[id]}</span> : null

  const dms = rooms.filter(r => r.dmA)
  const people = [...users].sort((x, y) => (online.includes(y) ? 1 : 0) - (online.includes(x) ? 1 : 0) || x.localeCompare(y))
  const signOut = () => { client.current?.deactivate(); setToken(null); localStorage.removeItem('user'); setUser(null) }

  return (<div className="shell">
    <aside className="side">
      <div className="brand"><Logo size={32} /><span>Connect</span></div>
      <h3>Rooms</h3>
      <nav>{rooms.filter(r => !r.dmA).map(r => <button key={r.id} className={'room' + (active === r.id ? ' on' : '')} onClick={() => setActive(r.id)}><span className="hash">#</span>{r.name}<Badge id={r.id} /></button>)}</nav>
      <form className="newroom" onSubmit={createRoom}><input placeholder="Create a room" value={newRoom} onChange={e => setNewRoom(e.target.value)} /><button className="plus" aria-label="Create room">+</button></form>
      <h3>Direct messages</h3>
      <nav>{dms.map(r => { const n = title(r)
        return <button key={r.id} className={'room' + (active === r.id ? ' on' : '')} onClick={() => setActive(r.id)}>
          <span className="avwrap"><Avatar name={n} /><span className={'pres' + (online.includes(n) ? ' ok' : '')} /></span>{n}<Badge id={r.id} /></button> })}
        {!dms.length && <small className="hint">Pick someone from People to start a chat.</small>}</nav>
      <div className="grow" />
      <div className="me"><Avatar name={user} /><div className="meinfo"><b>{user}</b><small><span className={'dot' + (conn ? ' ok' : '')} />{conn ? 'Connected' : 'Reconnecting...'}</small></div>
        <button className="signout" onClick={signOut}>Sign out</button></div>
    </aside>
    <main>
      <header><div><h1>{room ? (room.dmA ? '@ ' : '# ') + title(room) : 'Pick a room'}</h1>{room && <small className="muted">{room.dmA ? 'Direct message' : 'Public room'}</small>}</div>
        <span className={'pill' + (conn ? ' ok' : '')}>{conn ? 'Live' : 'Offline'}</span></header>
      {error && <div className="error">{error}</div>}
      <div className="feed">
        {!list.length && room && <p className="muted center">No messages here yet. Say hello.</p>}
        {list.map((m, i) => { const mine = m.sender === user, same = list[i - 1]?.sender === m.sender
          return (<div key={m.id} className={'msg' + (mine ? ' mine' : '')}>
            {!same && <div className="who"><Avatar name={m.sender} /><b>{mine ? 'You' : m.sender}</b><small>{clock(m.sentAt)}</small></div>}
            <div className="bubble">
              {m.deleted ? <em className="gone">This message was deleted</em> : edit?.id === m.id ? (
                <form onSubmit={saveEdit} className="editf"><input autoFocus value={edit.text} onChange={e => setEdit({ ...edit, text: e.target.value })} />
                  <button className="mini">Save</button><button type="button" className="mini" onClick={() => setEdit(null)}>Cancel</button></form>
              ) : <>
                {m.content && <p>{m.content}</p>}
                {m.fileUrl && (isImg(m.fileName) ? <a href={m.fileUrl} target="_blank" rel="noreferrer"><img className="shot" src={m.fileUrl} alt={m.fileName} /></a>
                  : <a className="file" href={m.fileUrl} download={m.fileName}>&#128206; {m.fileName}</a>)}
                {m.edited && <small className="ed">edited</small>}
                {mine && <span className="acts">{m.content && <button aria-label="Edit" onClick={() => setEdit({ id: m.id, text: m.content })}>&#9998;</button>}<button aria-label="Delete" onClick={() => delMsg(m.id)}>&times;</button></span>}
              </>}
            </div></div>) })}
        <div ref={end} />
      </div>
      <div className="typing">{typing && `${typing} is typing...`}</div>
      <form className="composer" onSubmit={send}>
        <input type="file" ref={fileIn} onChange={attach} hidden />
        <button type="button" className="clip" aria-label="Attach a file" disabled={!conn || !room || busy} onClick={() => fileIn.current.click()}>{busy ? '...' : '+'}</button>
        <input value={text} onChange={onType} maxLength={1000} placeholder={conn ? `Message ${room ? title(room) : ''}` : 'Connecting...'} disabled={!conn || !room} />
        <button className="send" aria-label="Send" disabled={!conn || !text.trim()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg></button></form>
    </main>
    <aside className="people">
      <h3>People <span>{online.length} online</span></h3>
      <nav>{people.map(u => <button key={u} className="person" onClick={() => openDm(u)}>
        <span className="avwrap"><Avatar name={u} /><span className={'pres' + (online.includes(u) ? ' ok' : '')} /></span>
        <span className="pname">{u}<small>{online.includes(u) ? 'Online' : 'Offline'}</small></span></button>)}
        {!people.length && <small className="hint">Other people appear here once they register.</small>}</nav>
    </aside>
  </div>)
}
