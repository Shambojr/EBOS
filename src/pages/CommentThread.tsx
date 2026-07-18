// ════════════════════════════════════════════════════════════
// EBOS — CommentThread
// Drop into any card: <CommentThread entityType="task" entityId={id} .../>
// Handles fetch, post, @mention, delete — fully self-contained
// ════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { useComments } from '../hooks/useComments'
import { colors as C_, space, radius as R, type as TY } from '../design/tokens'
import { Ico } from '../design/icons'
import { PaperClipIcon, XMarkIcon } from '../design/icons'

interface CommentThreadProps {
  entityType:  'task' | 'log' | 'milestone' | 'expense'
  entityId:    string
  currentUser: { id: string; full_name: string }
  teamUsers:   any[]   // { id, full_name, role }
  defaultOpen?: boolean
}

function initials(name?: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs/24)}d ago`
}

// Highlight @mentions in comment body
function renderBody(body: string) {
  const parts = body.split(/(@\w[\w\s]*)/g)
  return parts.map((p, i) =>
    p.startsWith('@')
      ? <strong key={i} style={{ color: C_.info }}>{p}</strong>
      : p
  )
}

export function CommentThread({ entityType, entityId, currentUser, teamUsers, defaultOpen = false }: CommentThreadProps) {
  const { comments, loading, addComment, deleteComment } = useComments(entityType, entityId)
  const [open,     setOpen]     = useState(defaultOpen)
  const [body,     setBody]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [mentions, setMentions] = useState<string[]>([])
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionQuery, setMentionQuery]           = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const count = comments.length

  // Detect @ in textarea
  const handleInput = (val: string) => {
    setBody(val)
    const atIdx = val.lastIndexOf('@')
    if (atIdx >= 0 && (atIdx === 0 || val[atIdx-1] === ' ' || val[atIdx-1] === '\n')) {
      const query = val.slice(atIdx + 1).toLowerCase()
      if (!query.includes(' ') && query.length <= 20) {
        setMentionQuery(query)
        setShowMentionPicker(true)
        return
      }
    }
    setShowMentionPicker(false)
  }

  const insertMention = (user: any) => {
    const atIdx = body.lastIndexOf('@')
    const newBody = body.slice(0, atIdx) + `@${user.full_name} `
    setBody(newBody)
    setMentions(m => [...new Set([...m, user.id])])
    setShowMentionPicker(false)
    textareaRef.current?.focus()
  }

  const filteredUsers = teamUsers.filter(u =>
    u.id !== currentUser.id &&
    u.full_name.toLowerCase().includes(mentionQuery)
  )

  const submit = async () => {
    if (!body.trim()) return
    setSaving(true)
    const err = await addComment(body.trim(), currentUser.id, mentions, teamUsers)
    setSaving(false)
    if (!err) {
      setBody('')
      setMentions([])
      setShowMentionPicker(false)
      if (!open) setOpen(true)
    }
  }

  const NAVY = C_.brand

  return (
    <div style={{ borderTop: `1px solid ${C_.border}`, marginTop: space[2] }}>
      {/* Toggle header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:space[2], padding:`${space[2]} 0`, cursor:'pointer', userSelect:'none' }}
      >
        <Ico icon={PaperClipIcon} size={14} color={C_.textTertiary}/>
        <span style={{ fontSize:'12px', fontWeight:600, color:C_.textSecondary }}>
          {count === 0 ? 'Add comment' : `${count} comment${count>1?'s':''}`}
        </span>
        <span style={{ fontSize:'11px', color:C_.textTertiary, marginLeft:'auto' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div style={{ paddingBottom: space[3] }}>
          {/* Comment list */}
          {loading && <div style={{ fontSize:'12px', color:C_.textTertiary, padding:`${space[1]} 0` }}>Loading…</div>}

          {comments.map(c => {
            const isOwn = c.created_by === currentUser.id
            return (
              <div key={c.id} style={{ display:'flex', gap:space[2], marginBottom:space[2], alignItems:'flex-start' }}>
                {/* Avatar */}
                <div style={{
                  width:'28px', height:'28px', borderRadius:'8px',
                  background: NAVY, color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'10px', fontWeight:700, flexShrink:0,
                }}>
                  {initials(c.author?.full_name)}
                </div>
                {/* Bubble */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', gap:space[2], alignItems:'baseline', marginBottom:'2px' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:C_.textPrimary }}>
                      {c.author?.full_name?.split(' ')[0] || '—'}
                    </span>
                    <span style={{ fontSize:'10px', color:C_.textTertiary }}>{timeAgo(c.created_at)}</span>
                  </div>
                  <div style={{
                    fontSize:'13px', color:C_.textPrimary, lineHeight:1.5,
                    background: isOwn ? C_.infoBg : C_.bgMuted,
                    padding:`${space[2]} ${space[3]}`,
                    borderRadius: isOwn ? `${R.md} ${R.md} ${R.sm} ${R.md}` : `${R.md} ${R.md} ${R.md} ${R.sm}`,
                  }}>
                    {renderBody(c.body)}
                  </div>
                </div>
                {/* Delete own */}
                {isOwn && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:C_.textTertiary, padding:'4px', flexShrink:0, marginTop:'4px' }}
                  >
                    <Ico icon={XMarkIcon} size={12}/>
                  </button>
                )}
              </div>
            )
          })}

          {/* Composer */}
          <div style={{ position:'relative' }}>
            {/* @mention dropdown */}
            {showMentionPicker && filteredUsers.length > 0 && (
              <div style={{
                position:'absolute', bottom:'100%', left:0, right:0, zIndex:100,
                background:'#fff', borderRadius:R.lg, border:`1px solid ${C_.border}`,
                boxShadow:'0 4px 12px rgba(0,0,0,.12)', maxHeight:'160px', overflowY:'auto',
              }}>
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => insertMention(u)}
                    style={{ padding:`${space[2]} ${space[3]}`, cursor:'pointer', display:'flex', gap:space[2], alignItems:'center', borderBottom:`1px solid ${C_.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = C_.bgMuted)}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <div style={{ width:'24px', height:'24px', borderRadius:'6px', background:NAVY, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', fontWeight:700 }}>
                      {initials(u.full_name)}
                    </div>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:600, color:C_.textPrimary }}>{u.full_name}</div>
                      <div style={{ fontSize:'11px', color:C_.textSecondary, textTransform:'capitalize' }}>{u.role?.replace(/_/g,' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:space[2], alignItems:'flex-end' }}>
              {/* My avatar */}
              <div style={{ width:'28px', height:'28px', borderRadius:'8px', background:NAVY, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0, marginBottom:'2px' }}>
                {initials(currentUser.full_name)}
              </div>
              <div style={{ flex:1, position:'relative' }}>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={e => handleInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !showMentionPicker) { e.preventDefault(); submit() } }}
                  placeholder="Add a comment… use @ to mention"
                  rows={1}
                  style={{
                    width:'100%', boxSizing:'border-box',
                    padding:`${space[2]} ${space[3]}`,
                    border:`1.5px solid ${body ? C_.info : C_.border}`,
                    borderRadius:R.md, fontSize:'13px',
                    fontFamily:'inherit', resize:'none',
                    outline:'none', lineHeight:1.5,
                    transition:'border-color .15s',
                    background:'#fff',
                  }}
                />
                {body.trim() && (
                  <button
                    onClick={submit}
                    disabled={saving}
                    style={{
                      position:'absolute', right:'8px', bottom:'8px',
                      height:'24px', padding:'0 10px', borderRadius:'6px',
                      background: saving ? C_.bgMuted : NAVY,
                      color:'#fff', border:'none', cursor:'pointer',
                      fontSize:'11px', fontWeight:700,
                    }}
                  >
                    {saving ? '…' : 'Send'}
                  </button>
                )}
              </div>
            </div>
            {teamUsers.length > 0 && !body && (
              <div style={{ fontSize:'10px', color:C_.textTertiary, marginTop:'3px', paddingLeft:'36px' }}>
                Type @ to mention a team member
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
