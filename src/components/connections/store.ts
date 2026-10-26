// Connection requests between interns, kept in this browser for now.
// Backend: swap these function bodies for Supabase calls (a connections table with
// from_user, to_user, status, created_at). The pages only use these functions.

export type ConnectionStatus = 'pending' | 'connected'

export type Connection = {
  internId: string
  name: string
  role: string
  school: string
  status: ConnectionStatus
  requestedAt: string // ISO
}

const KEY = 'subtle-connections-v1'

function read(): Connection[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Connection[]) : []
  } catch {
    return []
  }
}

function write(list: Connection[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
}

// TODO(backend): load this user's connections (sent requests and accepted ones)
export function loadConnections(): Connection[] {
  return read()
}

// TODO(backend): create a connection request
export function sendConnectionRequest(intern: { id: string; name: string; role: string; school: string }): Connection[] {
  const list = read()
  if (list.some((c) => c.internId === intern.id)) return list
  const next: Connection[] = [
    { internId: intern.id, name: intern.name, role: intern.role, school: intern.school, status: 'pending', requestedAt: new Date().toISOString() },
    ...list,
  ]
  write(next)
  return next
}

// TODO(backend): cancel a pending request
export function cancelConnectionRequest(internId: string): Connection[] {
  const next = read().filter((c) => !(c.internId === internId && c.status === 'pending'))
  write(next)
  return next
}

// For the profile page: how many people you're connected with
export function connectionCount(status: ConnectionStatus = 'connected') {
  return read().filter((c) => c.status === status).length
}
