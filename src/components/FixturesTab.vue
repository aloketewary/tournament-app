<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SheetData, MatchData } from '../services/sheetService'
import { updateMatch, addMatch } from '../services/sheetService'

const props = defineProps<{ data: SheetData, game: string }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

interface Slot {
  matchId: string | null; round: number; pos: number
  team1: string | null; team2: string | null; winner: string | null
  date: string; remarks: string; fromSheet: boolean
}

const totalRounds = computed(() => {
  const n = props.data.teams.length
  return n < 2 ? 0 : Math.ceil(Math.log2(n))
})
const size = computed(() => Math.pow(2, totalRounds.value))

function findMatch(t1: string, t2: string): MatchData | undefined {
  return props.data.matches.find(m =>
    (m.team1Id === t1 && m.team2Id === t2) || (m.team1Id === t2 && m.team2Id === t1))
}

const bracket = computed(() => {
  const rounds: Slot[][] = []
  const n = props.data.teams.length
  if (n < 2) return rounds

  const r1: Slot[] = []
  const r1Matches = props.data.matches.filter(m => {
    const num = parseInt(m.matchId.replace(/\D/g, ''))
    return num <= size.value / 2
  })
  for (let i = 0; i < size.value / 2; i++) {
    const sm = r1Matches[i]
    r1.push(sm ? {
      matchId: sm.matchId, round: 1, pos: i,
      team1: sm.team1Id, team2: sm.team2Id, winner: sm.winner || null,
      date: sm.scheduledDate, remarks: sm.remarks, fromSheet: true,
    } : {
      matchId: null, round: 1, pos: i,
      team1: null, team2: null, winner: null,
      date: '', remarks: '', fromSheet: false,
    })
  }
  rounds.push(r1)

  for (let r = 2; r <= totalRounds.value; r++) {
    const prev = rounds[r - 2]
    const cur: Slot[] = []
    for (let i = 0; i < prev.length; i += 2) {
      const w1 = prev[i]?.winner || null
      const w2 = prev[i + 1]?.winner || null
      let sm: MatchData | undefined
      if (w1 && w2) sm = findMatch(w1, w2)
      cur.push(sm ? {
        matchId: sm.matchId, round: r, pos: cur.length,
        team1: sm.team1Id, team2: sm.team2Id, winner: sm.winner || null,
        date: sm.scheduledDate, remarks: sm.remarks, fromSheet: true,
      } : {
        matchId: null, round: r, pos: cur.length,
        team1: w1, team2: w2, winner: null,
        date: '', remarks: '', fromSheet: false,
      })
    }
    rounds.push(cur)
  }
  return rounds
})

const champion = computed(() => {
  if (!bracket.value.length) return null
  return bracket.value[bracket.value.length - 1]?.[0]?.winner || null
})

function name(id: string | null) {
  if (!id) return ''
  const t = props.data.teams.find(t => t.id === id)
  return t ? t.players.map(p => p.name).join(' & ') : id
}
function short(id: string | null) {
  if (!id) return ''
  const t = props.data.teams.find(t => t.id === id)
  return t ? t.players.map(p => p.name.split(' ')[0]).join(' & ') : id
}
function roundLabel(r: number) {
  const t = totalRounds.value
  if (r === t) return '🏆 Final'
  if (r === t - 1) return 'Semi-Final'
  if (r === t - 2) return 'Quarter-Final'
  return `Round ${r}`
}
function state(s: Slot): 'done' | 'ready' | 'wait' | 'empty' {
  if (s.winner) return 'done'
  if (s.team1 && s.team2) return 'ready'
  if (s.team1 || s.team2) return 'wait'
  return 'empty'
}

const ed = ref<Slot | null>(null)
const edWinner = ref('')
const edDate = ref('')
const edRemarks = ref('')
const saving = ref(false)
const toast = ref<{ ok: boolean, msg: string } | null>(null)

function open(s: Slot) {
  const st = state(s)
  if (st === 'empty' || st === 'wait') return
  ed.value = s; edWinner.value = s.winner || ''; edDate.value = s.date; edRemarks.value = s.remarks
}

async function save() {
  if (!ed.value) return
  saving.value = true; toast.value = null
  try {
    if (ed.value.fromSheet && ed.value.matchId) {
      const r = await updateMatch(props.game, ed.value.matchId, { winner: edWinner.value, scheduledDate: edDate.value, remarks: edRemarks.value })
      toast.value = r.success ? { ok: true, msg: 'Updated!' } : { ok: false, msg: 'Failed' }
    } else {
      const r = await addMatch(props.game, ed.value.team1!, ed.value.team2!, edDate.value, edRemarks.value)
      if (r.success && edWinner.value) await updateMatch(props.game, r.matchId!, { winner: edWinner.value })
      toast.value = r.success ? { ok: true, msg: `${r.matchId} saved!` } : { ok: false, msg: r.error || 'Failed' }
    }
    setTimeout(() => { ed.value = null; toast.value = null; emit('refresh') }, 600)
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
}
</script>

<template>
  <div class="fix">
    <div v-if="!data.teams.length" class="empty">
      <p>📋 No teams registered yet</p>
    </div>

    <!-- Champion -->
    <div v-if="champion" class="champ">
      <span class="champ-icon">🏆</span>
      <div><div class="champ-lbl">Champion</div><div class="champ-name">{{ champion }} — {{ name(champion) }}</div></div>
    </div>

    <!-- Bracket -->
    <div v-if="bracket.length" class="bwrap">
      <div class="bscroll">
        <div class="bracket">
          <div v-for="(round, ri) in bracket" :key="ri" class="round">
            <div class="rlabel">{{ roundLabel(ri + 1) }}</div>
            <div class="rslots" :style="{
              paddingTop: ri > 0 ? (26 * Math.pow(2, ri) - 26) + 'px' : '0',
              gap: ri > 0 ? (26 * Math.pow(2, ri)) + 'px' : '6px'
            }">
              <div v-for="s in round" :key="s.pos" :class="['s', state(s)]" @click="open(s)">
                <div :class="['st', { w: s.winner === s.team1, l: s.winner && s.winner !== s.team1 && !!s.team1 }]">
                  <span v-if="s.team1" class="sid">{{ s.team1 }}</span>
                  <span v-if="s.team1" class="sn">{{ short(s.team1) }}</span>
                  <span v-else class="se">—</span>
                </div>
                <div class="sd"></div>
                <div :class="['st', { w: s.winner === s.team2, l: s.winner && s.winner !== s.team2 && !!s.team2 }]">
                  <span v-if="s.team2" class="sid">{{ s.team2 }}</span>
                  <span v-if="s.team2" class="sn">{{ short(s.team2) }}</span>
                  <span v-else class="se">—</span>
                </div>
                <div class="sf">
                  <span v-if="s.matchId" class="sf-id">{{ s.matchId }}</span>
                  <span v-if="s.date" class="sf-d">{{ s.date }}</span>
                  <span v-if="s.remarks && s.winner" class="sf-sc">{{ s.remarks }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- Modal -->
    <Teleport to="body">
      <div v-if="ed" class="overlay" @click.self="ed = null">
        <div class="modal">
          <h3>{{ ed.fromSheet ? 'Edit Match' : 'Set Result' }}</h3>
          <div class="mu">
            <div class="mu-t"><span class="mu-id">{{ ed.team1 }}</span> {{ name(ed.team1) }}</div>
            <div class="mu-vs">VS</div>
            <div class="mu-t"><span class="mu-id">{{ ed.team2 }}</span> {{ name(ed.team2) }}</div>
          </div>
          <div v-if="toast" :class="['toast', toast.ok ? 'ok' : 'err']">{{ toast.msg }}</div>
          <label>Winner
            <div class="wbtns">
              <button :class="['wb', { sel: edWinner === ed.team1 }]" @click="edWinner = ed.team1!">
                {{ ed.team1 }} — {{ short(ed.team1) }}
              </button>
              <button :class="['wb', { sel: edWinner === ed.team2 }]" @click="edWinner = ed.team2!">
                {{ ed.team2 }} — {{ short(ed.team2) }}
              </button>
            </div>
          </label>
          <label>Score / Remarks <input v-model="edRemarks" placeholder="e.g. 3-1, walkover" /></label>
          <label>Date <input v-model="edDate" placeholder="e.g. 23-Apr" /></label>
          <div class="btns">
            <button class="bc" @click="ed = null">Cancel</button>
            <button class="bs" @click="save" :disabled="saving || !edWinner">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fix { display: flex; flex-direction: column; gap: 24px; }
.empty { text-align: center; padding: 60px; color: var(--text); font-size: 14px; background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius); }

.champ {
  display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.03));
  border: 1px solid rgba(234,179,8,0.2);
}
.champ-icon { font-size: 28px; }
.champ-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ca8a04; }
.champ-name { font-size: 15px; font-weight: 700; color: var(--text-h); }

/* Bracket */
.bwrap { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
.bscroll { overflow-x: auto; scrollbar-width: none; }
.bscroll::-webkit-scrollbar { display: none; }
.bracket { display: flex; gap: 16px; min-width: max-content; }
.round { min-width: 175px; }
.rlabel {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
  color: var(--accent); margin-bottom: 8px; padding-bottom: 5px; border-bottom: 2px solid var(--accent-bg);
}
.rslots { display: flex; flex-direction: column; }

.s {
  padding: 6px 10px; border-radius: 8px; min-width: 160px;
  border: 1px solid var(--border); background: var(--bg); transition: all 0.15s;
}
.s.ready { border-color: var(--accent-border); cursor: pointer; }
.s.ready:hover { box-shadow: var(--shadow-md); border-color: var(--accent); }
.s.done { border-color: var(--green-border); background: var(--green-bg); cursor: pointer; }
.s.done:hover { box-shadow: var(--shadow-md); }
.s.wait { opacity: 0.35; border-style: dashed; }
.s.empty { opacity: 0.2; border-style: dashed; }

.st { display: flex; align-items: center; gap: 5px; padding: 3px 0; font-size: 11.5px; min-height: 22px; }
.st.w .sn { color: var(--green); font-weight: 700; }
.st.w .sid { color: var(--green); }
.st.l { opacity: 0.3; }
.st.l .sn { text-decoration: line-through; }
.sid { font-size: 9px; font-weight: 800; color: var(--accent); min-width: 20px; }
.sn { font-weight: 600; color: var(--text-h); }
.se { color: var(--border); }
.sd { height: 1px; background: var(--border); }
.sf { display: flex; gap: 5px; margin-top: 3px; min-height: 14px; align-items: center; }
.sf-id { font-size: 9px; font-weight: 700; color: var(--text); }
.sf-d { font-size: 9px; color: var(--accent); }
.sf-sc { font-size: 9px; font-weight: 700; color: var(--green); background: var(--green-bg); padding: 1px 5px; border-radius: 4px; }

/* Results */
.results { border-top: 1px solid var(--border); padding-top: 16px; }
.results h3 { font-size: 12px; color: var(--text); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.rrow {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 7px 12px; border-radius: 8px; font-size: 12px;
  background: var(--card); border: 1px solid var(--border); margin-bottom: 4px;
}
.rid { font-size: 10px; font-weight: 700; color: var(--text); min-width: 26px; }
.rw { color: var(--green); font-weight: 700; }
.rvs { font-size: 10px; color: var(--text); }
.rwn { color: var(--green); font-weight: 600; }
.rsc { color: var(--text); }

/* Modal */
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: var(--card); border: 1px solid var(--border); border-radius: 18px;
  padding: 24px; width: 420px; max-width: 90vw; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; gap: 14px;
}
.modal h3 { font-size: 15px; margin: 0; }
.mu {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px; border-radius: var(--radius-sm); background: var(--bg);
}
.mu-t { font-size: 13px; font-weight: 600; color: var(--text-h); display: flex; align-items: center; gap: 8px; }
.mu-id { font-size: 10px; font-weight: 800; color: var(--accent); background: var(--accent-bg); padding: 2px 8px; border-radius: 6px; }
.mu-vs { font-size: 11px; font-weight: 800; color: #fff; background: var(--accent); padding: 2px 12px; border-radius: 20px; }

.toast { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.toast.ok { background: var(--green-bg); color: var(--green); }
.toast.err { background: var(--red-bg); color: var(--red); }

.modal label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 600; color: var(--text); }
.modal input {
  padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-h); font-size: 13px; font-family: inherit;
}
.modal input:focus { outline: none; border-color: var(--accent); }

.wbtns { display: flex; gap: 8px; }
.wb {
  flex: 1; padding: 11px 8px; border-radius: var(--radius-sm); border: 2px solid var(--border);
  background: var(--card); color: var(--text-h); font-size: 12px; font-weight: 600;
  transition: all 0.15s; text-align: center;
}
.wb:hover { border-color: var(--accent-border); }
.wb.sel { border-color: var(--green); background: var(--green-bg); color: var(--green); box-shadow: 0 0 0 3px rgba(16,185,129,0.08); }

.btns { display: flex; gap: 8px; margin-top: 4px; }
.bc { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-weight: 600; font-size: 13px; }
.bs { flex: 2; padding: 10px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-weight: 700; font-size: 13px; }
.bs:disabled { opacity: 0.35; cursor: not-allowed; }

@media (max-width: 600px) { .wbtns { flex-direction: column; } }
</style>
