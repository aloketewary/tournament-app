const SHEET_ID = '1_-LEwXwF9fhHAwBQr2IDbr4H0u5b_bw5N7-8tm3uwdg'
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

function parseCSV(csv: string): string[][] {
  const rows: string[][] = []
  for (const line of csv.split('\n')) {
    if (!line.trim()) continue
    const row: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = '' }
      else cur += ch
    }
    row.push(cur.trim())
    rows.push(row)
  }
  return rows
}

export interface Player {
  name: string
  partner: string | null
  days: string[]
  remarks: string
  completedOn: string
  withdrawn: boolean
}

export interface Team {
  id: string
  players: Player[]
  days: string[]
  remarks: string
  completedOn: string
}

export interface MatchData {
  matchId: string
  team1Id: string
  team2Id: string
  team1Label: string
  team2Label: string
  scheduledDate: string
  winner: string
  remarks: string
}

export interface SheetData {
  teams: Team[]
  matches: MatchData[]
  withdrawn: Player[]
}

const DAY_MAP: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri'
}

function parseDays(raw: string): string[] {
  if (!raw) return []
  return Object.entries(DAY_MAP).filter(([k]) => raw.toLowerCase().includes(k)).map(([, v]) => v)
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findPartner(players: Player[], partnerName: string, seen: Set<string>): Player | undefined {
  const norm = normalize(partnerName)
  let mate = players.find(x => !x.withdrawn && !seen.has(normalize(x.name)) && normalize(x.name) === norm)
  if (mate) return mate
  mate = players.find(x => !x.withdrawn && !seen.has(normalize(x.name)) &&
    (normalize(x.name).includes(norm) || norm.includes(normalize(x.name))))
  if (mate) return mate
  const compact = norm.replace(/\s/g, '')
  return players.find(x => !x.withdrawn && !seen.has(normalize(x.name)) &&
    normalize(x.name).replace(/\s/g, '') === compact)
}

function teamLabel(t: Team): string {
  return t.players.map(p => p.name).join(' & ')
}

async function fetchCSV(sheetName: string): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(sheetName)}`
  const res = await fetch(url)
  const text = await res.text()
  if (!text.trim()) return []
  return parseCSV(text)
}

function parsePlayers(rows: string[][]): { players: Player[], teamIds: Map<string, string> } {
  if (rows.length < 2) return { players: [], teamIds: new Map() }
  const headers = rows[0]
  const hasTeamId = normalize(headers[0]).includes('team id')
  const players: Player[] = []
  const teamIds = new Map<string, string>()
  const seen = new Set<string>()
  let autoId = 1

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (hasTeamId) {
      if (!row[1]) continue
      const remarks = row[4] || ''
      const p: Player = {
        name: row[1], partner: row[2] || null,
        days: parseDays(row[3] || ''), remarks,
        completedOn: row[5] || '',
        withdrawn: remarks.toLowerCase().includes('withdrawn'),
      }
      players.push(p)
      if (row[0]) teamIds.set(p.name, row[0])
    } else {
      if (!row[0]) continue
      const remarks = row[3] || ''
      const p: Player = {
        name: row[0], partner: row[1] || null,
        days: parseDays(row[2] || ''), remarks,
        completedOn: row[4] || '',
        withdrawn: remarks.toLowerCase().includes('withdrawn'),
      }
      players.push(p)
      if (!seen.has(normalize(p.name))) {
        teamIds.set(p.name, `T${autoId++}`)
        seen.add(normalize(p.name))
      }
    }
  }
  return { players, teamIds }
}

function buildTeams(players: Player[], teamIds: Map<string, string>): Team[] {
  const seen = new Set<string>()
  const teams: Team[] = []
  for (const p of players) {
    if (p.withdrawn || seen.has(normalize(p.name))) continue
    seen.add(normalize(p.name))
    const tid = teamIds.get(p.name) || `T${teams.length + 1}`

    if (p.partner) {
      const mate = findPartner(players, p.partner, seen)
      if (mate) {
        seen.add(normalize(mate.name))
        const common = p.days.filter(d => mate.days.includes(d))
        teams.push({
          id: tid, players: [p, mate],
          days: common.length ? common : [...new Set([...p.days, ...mate.days])],
          remarks: [p.remarks, mate.remarks].filter(Boolean).join('; '),
          completedOn: p.completedOn || mate.completedOn || '',
        })
      } else {
        const partnerPlayer: Player = { name: p.partner, partner: p.name, days: [], remarks: '', completedOn: '', withdrawn: false }
        teams.push({ id: tid, players: [p, partnerPlayer], days: p.days, remarks: p.remarks, completedOn: p.completedOn })
      }
    } else {
      teams.push({ id: tid, players: [p], days: p.days, remarks: p.remarks, completedOn: p.completedOn })
    }
  }
  return teams
}

function parseMatches(rows: string[][], teams: Team[]): MatchData[] {
  if (rows.length < 2) return []
  return rows.slice(1).filter(r => r[0]).map(row => {
    const raw1 = row[1] || ''
    const raw2 = row[2] || ''
    const t1 = teams.find(t => t.id === raw1)
    const t2 = teams.find(t => t.id === raw2)
    return {
      matchId: row[0],
      team1Id: t1?.id || raw1,
      team2Id: t2?.id || raw2,
      team1Label: t1 ? teamLabel(t1) : raw1,
      team2Label: t2 ? teamLabel(t2) : raw2,
      scheduledDate: row[3] || '',
      winner: row[4] || '',
      remarks: row[5] || '',
    }
  })
}

export async function fetchSheet(sheetName: string): Promise<SheetData> {
  // Fetch players from main tab
  const playerRows = await fetchCSV(sheetName)
  const { players, teamIds } = parsePlayers(playerRows)
  const teams = buildTeams(players, teamIds)

  // Fetch matches from _Matches tab (may not exist yet)
  let matches: MatchData[] = []
  try {
    const matchRows = await fetchCSV(sheetName + '_Matches')
    matches = parseMatches(matchRows, teams)
  } catch { /* tab doesn't exist yet, that's fine */ }

  return {
    teams,
    matches,
    withdrawn: players.filter(p => p.withdrawn),
  }
}

// Write-back: uses Team IDs
export async function addMatch(sheetName: string, team1Id: string, team2Id: string, scheduledDate: string, remarks: string): Promise<{ success: boolean, matchId?: string, error?: string }> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'addMatch', sheetName, team1: team1Id, team2: team2Id, scheduledDate, remarks, updatedBy: getUser() }),
  })
  return res.json()
}

export async function updateMatch(sheetName: string, matchId: string, data: { scheduledDate?: string, winner?: string, remarks?: string }): Promise<{ success: boolean }> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'updateMatch', sheetName, matchId, ...data, updatedBy: getUser() }),
  })
  return res.json()
}

export async function deleteMatch(sheetName: string, matchId: string): Promise<{ success: boolean }> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteMatch', sheetName, matchId, updatedBy: getUser() }),
  })
  return res.json()
}

// User management
export function getUser(): string {
  return localStorage.getItem('tournament_user') || ''
}

export function setUser(name: string) {
  localStorage.setItem('tournament_user', name.trim())
}

export function hasUser(): boolean {
  return !!getUser()
}

// Export helpers
function teamName(teams: Team[], id: string): string {
  const t = teams.find(t => t.id === id)
  return t ? t.players.map(p => p.name).join(' & ') : id
}

export function exportGameCSV(data: SheetData, gameName: string) {
  const lines: string[] = []

  // Players section
  lines.push('Team ID,Players,Days Available,Remarks')
  for (const t of data.teams) {
    const players = t.players.map(p => p.name).join(' & ')
    lines.push([t.id, players, t.days.join(', '), t.remarks].map(esc).join(','))
  }
  if (data.withdrawn.length) {
    for (const p of data.withdrawn) {
      lines.push(['', p.name, '', 'Withdrawn'].map(esc).join(','))
    }
  }

  // Matches section
  if (data.matches.length) {
    lines.push('')
    lines.push('Match ID,Team 1,Team 2,Scheduled Date,Winner,Remarks')
    for (const m of data.matches) {
      const t1 = teamName(data.teams, m.team1Id)
      const t2 = teamName(data.teams, m.team2Id)
      const winner = m.winner ? teamName(data.teams, m.winner) : ''
      lines.push([m.matchId, t1, t2, m.scheduledDate, winner, m.remarks].map(esc).join(','))
    }
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${gameName.replace(/_/g, ' ')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function esc(val: string): string {
  if (!val) return '""'
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}
