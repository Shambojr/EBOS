// ════════════════════════════════════════════════════════════
// EBOS Messages Sheet
// Direct messages between team members + one chat thread per project.
// Floating overlay, opened from the top bar next to Notifications.
// ════════════════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react'
import { colors as C_, space, radius as R, shadow } from '../design/tokens'
import { Ico, XMarkIcon, ChevronLeftIcon, PlusIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, BuildingOffice2Icon } from '../design/icons'
import { initials, smartDate } from '../design/business'
import { useMessages, type Conversation } from '../hooks/useMessages'
import type { User } from '../types'

interface MessagesSheetProps {
  onClose: () => void
  currentUser: User
  projects: { id: string; name: string }[]
}

type Screen = 'list' | 'new' | 'thread'

export function MessagesSheet({ onClose, currentUser, projects }: MessagesSheetProps) {
  const m = useMessages(currentUser)
  const [screen, setScreen] = useState<Screen>('list')
  const [draft, setDraft]   = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const activeConv = m.conversations.find(c => c.id === m.activeId)

  useEffect(() => {
    if (screen === 'thread' && bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [screen, m.messages])

  const goThread = async (id: string) => { await m.openConversation(id); setScreen('thread') }
  const goList   = () => { m.closeConversation(); setScreen('list') }

  const handleStartDirect = async (userId: string) => {
    const id = await m.startDirect(userId)
    if (id) await goThread(id)
  }
  const handleOpenProject = async (projectId: string) => {
    const id = await m.openProjectThread(projectId)
    if (id) await goThread(id)
  }

  const send = async () => {
    if (!draft.trim() || !m.activeId) return
    const body = draft
    setDraft('')
    await m.sendMessage(m.activeId, body)
  }

  const title = screen === 'new' ? 'New Message'
    : screen === 'thread' ? (activeConv?.type === 'direct' ? (activeConv?.otherUser?.full_name ?? 'Chat') : (activeConv?.projectName ?? 'Project Chat'))
    : 'Messages'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: C_.bgOverlay }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        marginTop: 'auto', background: '#fff', borderRadius: `${R.xxl} ${R.xxl} 0 0`,
        maxHeight: '92vh', height: screen === 'thread' ? '86vh' : undefined,
        display: 'flex', flexDirection: 'column', boxShadow: shadow.modal,
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: C_.border }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${space[3]} ${space[4]}`, borderBottom: `1px solid ${C_.divider}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[2], minWidth: 0 }}>
            {screen !== 'list' && (
              <button onClick={screen === 'thread' ? goList : () => setScreen('list')}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: C_.bgMuted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_.textSecondary, flexShrink: 0 }}>
                <Ico icon={ChevronLeftIcon} size={18} />
              </button>
            )}
            <div style={{ fontSize: '18px', fontWeight: 800, color: C_.textPrimary, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: space[1] }}>
            {screen === 'list' && (
              <button onClick={() => setScreen('new')}
                style={{ width: '32px', height: '32px', borderRadius: '50%', background: C_.bgMuted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_.brand }}>
                <Ico icon={PlusIcon} size={18} />
              </button>
            )}
            <button onClick={onClose}
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: C_.bgMuted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_.textSecondary }}>
              <Ico icon={XMarkIcon} size={16} />
            </button>
          </div>
        </div>

        {/* ── LIST ─────────────────────────────────────────────── */}
        {screen === 'list' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `${space[2]} ${space[4]} ${space[6]}` }}>
            {!m.loading && m.conversations.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${space[12]} ${space[6]}`, textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: C_.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: space[4] }}>
                  <Ico icon={ChatBubbleLeftRightIcon} size={24} color={C_.textSecondary} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: C_.textPrimary, marginBottom: '6px' }}>No messages yet</div>
                <div style={{ fontSize: '13px', color: C_.textSecondary, lineHeight: 1.6, marginBottom: space[5] }}>Message a team member or open a project chat.</div>
                <button onClick={() => setScreen('new')} style={{ height: '40px', padding: '0 18px', background: C_.brand, color: '#fff', border: 'none', borderRadius: R.md, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>New Message</button>
              </div>
            )}
            {m.conversations.map(c => (
              <ConversationRow key={c.id} conv={c} onClick={() => goThread(c.id)} />
            ))}
          </div>
        )}

        {/* ── NEW ──────────────────────────────────────────────── */}
        {screen === 'new' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: `${space[2]} ${space[4]} ${space[6]}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C_.textSecondary, padding: `${space[3]} 0 ${space[2]}` }}>Project Threads</div>
            {projects.length === 0 && <div style={{ fontSize: '13px', color: C_.textTertiary, padding: `${space[2]} 0` }}>No projects yet.</div>}
            {projects.map(p => (
              <div key={p.id} onClick={() => handleOpenProject(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: `${space[3]} 0`, borderBottom: `1px solid ${C_.divider}`, cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: R.md, background: C_.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C_.brand, flexShrink: 0 }}>
                  <Ico icon={BuildingOffice2Icon} size={18} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C_.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              </div>
            ))}

            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: C_.textSecondary, padding: `${space[4]} 0 ${space[2]}` }}>Team</div>
            {m.teamUsers.filter(u => u.id !== currentUser.id).map(u => (
              <div key={u.id} onClick={() => handleStartDirect(u.id)}
                style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: `${space[3]} 0`, borderBottom: `1px solid ${C_.divider}`, cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: C_.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                  {initials(u.full_name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C_.textPrimary }}>{u.full_name}</div>
                  <div style={{ fontSize: '12px', color: C_.textSecondary, textTransform: 'capitalize' }}>{u.role.replace(/_/g, ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── THREAD ───────────────────────────────────────────── */}
        {screen === 'thread' && (
          <>
            <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: `${space[3]} ${space[4]}`, display: 'flex', flexDirection: 'column', gap: space[2] }}>
              {!m.msgLoading && m.messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: `${space[8]} 0`, color: C_.textTertiary, fontSize: '13px' }}>No messages yet — say hello.</div>
              )}
              {m.messages.map((msg, i) => {
                const mine = msg.sender_id === currentUser.id
                const showName = activeConv?.type === 'project' && !mine && (i === 0 || m.messages[i - 1].sender_id !== msg.sender_id)
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                    {showName && <div style={{ fontSize: '11px', fontWeight: 700, color: C_.textSecondary, marginBottom: '2px', marginLeft: space[2] }}>{msg.sender?.full_name}</div>}
                    <div style={{
                      maxWidth: '78%', padding: `${space[2]} ${space[3]}`, borderRadius: mine ? `${R.lg} ${R.lg} 4px ${R.lg}` : `${R.lg} ${R.lg} ${R.lg} 4px`,
                      background: mine ? C_.brand : C_.bgMuted, color: mine ? '#fff' : C_.textPrimary,
                      fontSize: '14px', lineHeight: 1.45, wordBreak: 'break-word',
                    }}>
                      {msg.body}
                    </div>
                    <div style={{ fontSize: '10px', color: C_.textTertiary, marginTop: '3px', marginInline: space[2] }}>{smartDate(msg.created_at, 'ago')}</div>
                  </div>
                )
              })}
            </div>
            {/* Input bar */}
            <div style={{ display: 'flex', gap: space[2], padding: `${space[3]} ${space[4]}`, paddingBottom: `calc(${space[3]} + env(safe-area-inset-bottom, 0px))`, borderTop: `1px solid ${C_.divider}` }}>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') send() }}
                placeholder="Message…"
                style={{ flex: 1, height: '40px', padding: `0 ${space[3]}`, border: `1.5px solid ${C_.border}`, borderRadius: R.pill, fontSize: '14px', outline: 'none', fontFamily: "'Inter', system-ui, sans-serif" }}
              />
              <button onClick={send} disabled={!draft.trim()}
                style={{ width: '40px', height: '40px', borderRadius: '50%', background: draft.trim() ? C_.brand : C_.disabledBg, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
                <Ico icon={PaperAirplaneIcon} size={18} color={draft.trim() ? '#fff' : C_.disabledText} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Conversation row ──────────────────────────────────────────
function ConversationRow({ conv, onClick }: { conv: Conversation; onClick: () => void }) {
  const name = conv.type === 'direct' ? (conv.otherUser?.full_name ?? 'Unknown') : (conv.projectName ?? 'Project chat')
  const preview = conv.lastMessage?.body ?? 'No messages yet'
  const unread = conv.unreadCount > 0

  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: space[3], padding: `${space[3]} 0`, borderBottom: `1px solid ${C_.divider}`, cursor: 'pointer' }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: conv.type === 'project' ? R.md : '50%',
        background: conv.type === 'project' ? C_.bgMuted : C_.brand, color: conv.type === 'project' ? C_.brand : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, flexShrink: 0,
      }}>
        {conv.type === 'project' ? <Ico icon={BuildingOffice2Icon} size={20} /> : initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: space[2] }}>
          <div style={{ fontSize: '14px', fontWeight: unread ? 700 : 600, color: C_.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: '11px', color: C_.textTertiary, flexShrink: 0 }}>{smartDate(conv.last_message_at, 'ago')}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: space[2], marginTop: '2px' }}>
          <div style={{ fontSize: '13px', color: unread ? C_.textPrimary : C_.textSecondary, fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
          {unread && (
            <div style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: C_.danger, color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
              {conv.unreadCount}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
