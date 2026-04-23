<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SheetData, MatchData } from '../services/sheetService'
import { updateMatch, addMatch, deleteMatch } from '../services/sheetService'

const props = defineProps<{ data: SheetData, game: string }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const totalRounds = computed(() => {
  const n = props.data.teams.length
  return n < 2 ? 0 : Math.ceil(Math.log2(n))
})
const size = computed(() => Math.pow(2, totalRounds.value))

// Determine which round a match belongs to based on team history
const matchesByRound = computed(() => {
  const rounds: MatchData[][] = Array.from({ length: totalRounds.value }, () => [])
  if (!totalRounds.value) return rounds

  // Track which round each team last won in
  const teamRound = new Map<string, number>()

  // Sort matches by ID number
  const sorted = [...props.data.matches].sort((a, b) => {
    const na = parseInt(a.matchId.replace(/\D/g, ''))
    const nb = parseInt(b.matchId.replace(/\D/g, ''))
    return na - nb
  })

  for (const m of sorted) {
    // Round = max round either team has won in + 1, or 0 if neither has won before
    const r1 = teamRound.get(m.team1Id) ?? -1
    const r2 = teamRound.get(m.team2Id) ?? -1
    const round = Math.max(r1, r2) + 1
    const clampedRound = Math.min(round, totalRounds.value - 1)

    rounds[clampedRound].push(m)

    // If there's a winner, record their round
    if (m.winner) {
      teamRound.set(m.winner, clampedRound)
    }
  }

  return rounds
})

// Winners not yet placed in a later round
const availableWinners = computed(() => {
  const result: string[] = []
  for (let r = 0; r < matchesByRound.value.length - 1; r++) {
    for (const m of matchesByRound.value[r]) {
      if (!m.winner) continue
      let placed = false
      for (let nr = r + 1; nr < matchesByRound.value.length; nr++) {
        if (matchesByRound.value[nr].some(nm => nm.team1Id === m.winner || nm.team2Id === m.winner)) {
          placed = true; break
        }
      }
      if (!placed) result.push(m.winner)
    }
  }
  return [...new Set(result)]
})

const champion = computed(() => {
  const last = matchesByRound.value[matchesByRound.value.length - 1]
  return last?.[0]?.winner || null
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
function slotsForRound(r: number) {
  return Math.floor(size.value / Math.pow(2, r))
}

// --- Edit match modal ---
const ed = ref<MatchData | null>(null)
const edWinner = ref('')
const edDate = ref('')
const edRemarks = ref('')
const saving = ref(false)
const toast = ref<{ ok: boolean, msg: string } | null>(null)

function openMatch(m: MatchData) {
  ed.value = m; edWinner.value = m.winner; edDate.value = m.scheduledDate; edRemarks.value = m.remarks
}
async function saveMatch() {
  if (!ed.value) return
  saving.value = true; toast.value = null
  try {
    const r = await updateMatch(props.game, ed.value.matchId, {
      winner: edWinner.value, scheduledDate: edDate.value, remarks: edRemarks.value,
    })
    toast.value = r.success ? { ok: true, msg: 'Updated!' } : { ok: false, msg: 'Failed' }
    setTimeout(() => { ed.value = null; toast.value = null; emit('refresh') }, 600)
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
}

const confirmDelete = ref(false)
async function removeMatch() {
  if (!ed.value) return
  saving.value = true; toast.value = null
  try {
    const r = await deleteMatch(props.game, ed.value.matchId)
    toast.value = r.success ? { ok: true, msg: 'Deleted!' } : { ok: false, msg: 'Failed' }
    setTimeout(() => { ed.value = null; toast.value = null; confirmDelete.value = false; emit('refresh') }, 600)
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
}

// --- Pair winners for next round ---
const selectedWinners = ref<string[]>([])
const pairSaving = ref(false)

function toggleWinner(id: string) {
  const idx = selectedWinners.value.indexOf(id)
  if (idx >= 0) {
    selectedWinners.value.splice(idx, 1)
  } else {
    if (selectedWinners.value.length < 2) {
      selectedWinners.value.push(id)
    }
  }
}

async function createNextRoundMatch() {
  if (selectedWinners.value.length !== 2) return
  pairSaving.value = true; toast.value = null
  try {
    const r = await addMatch(props.game, selectedWinners.value[0], selectedWinners.value[1], '', '')
    if (r.success) {
      toast.value = { ok: true, msg: `${r.matchId} created!` }
      selectedWinners.value = []
      setTimeout(() => { toast.value = null; emit('refresh') }, 600)
    } else {
      toast.value = { ok: false, msg: r.error || 'Failed' }
    }
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  pairSaving.value = false
}
</script>

<template>
  <div class="fix">
    <div v-if="!data.teams.length" class="empty"><p>📋 No teams registered yet</p></div>

    <!-- Champion -->
    <div v-if="champion" class="champ">
      <span class="ci">🏆</span>
      <div><div class="cl">Champion</div><div class="cn">{{ champion }} — {{ name(champion) }}</div></div>
    </div>

    <!-- Pair Winners -->
    <div v-if="availableWinners.length >= 2" class="pair-section">
      <div class="pair-head">
        <span class="pair-dot"></span>
        <h3>Promote Winners — select 2 to create next match</h3>
      </div>
      <div class="pair-list">
        <button
          v-for="w in availableWinners" :key="w"
          :class="['wchip', { selected: selectedWinners.includes(w) }]"
          @click="toggleWinner(w)"
        >
          <span class="wc-id">{{ w }}</span>
          <span class="wc-name">{{ name(w) }}</span>
        </button>
      </div>
      <button
        v-if="selectedWinners.length === 2"
        class="pair-btn"
        @click="createNextRoundMatch"
        :disabled="pairSaving"
      >
        {{ pairSaving ? 'Creating...' : `Create: ${selectedWinners[0]} vs ${selectedWinners[1]} →` }}
      </button>
    </div>

    <!-- Single winner waiting -->
    <div v-else-if="availableWinners.length === 1" class="pair-section solo">
      <div class="pair-head">
        <span class="pair-dot"></span>
        <h3>Waiting for opponent</h3>
      </div>
      <div class="pair-list">
        <div class="wchip selected">
          <span class="wc-id">{{ availableWinners[0] }}</span>
          <span class="wc-name">{{ name(availableWinners[0]) }}</span>
        </div>
      </div>
    </div>

    <div v-if="toast && !ed" :class="['toast', toast.ok ? 'ok' : 'err']">{{ toast.msg }}</div>

    <!-- Bracket -->
    <div v-if="totalRounds" class="bwrap">
      <div class="bscroll">
        <div class="bracket">
          <div v-for="r in totalRounds" :key="r" class="round">
            <div class="rlabel">{{ roundLabel(r) }}</div>
            <div class="rslots" :style="{
              paddingTop: r > 1 ? (28 * Math.pow(2, r - 1) - 28) + 'px' : '0',
              gap: r > 1 ? (28 * Math.pow(2, r - 1)) + 'px' : '6px'
            }">
              <!-- Matches from sheet -->
              <div v-for="m in (matchesByRound[r - 1] || [])" :key="m.matchId"
                :class="['s', m.winner ? 'done' : 'ready']" @click="openMatch(m)">
                <div :class="['st', { w: m.winner === m.team1Id, l: m.winner && m.winner !== m.team1Id }]">
                  <span class="sid">{{ m.team1Id }}</span>
                  <span class="sn">{{ short(m.team1Id) }}</span>
                </div>
                <div class="sd"></div>
                <div :class="['st', { w: m.winner === m.team2Id, l: m.winner && m.winner !== m.team2Id }]">
                  <span class="sid">{{ m.team2Id }}</span>
                  <span class="sn">{{ short(m.team2Id) }}</span>
                </div>
                <div class="sf">
                  <span class="sf-id">{{ m.matchId }}</span>
                  <span v-if="m.scheduledDate" class="sf-d">{{ m.scheduledDate }}</span>
                  <span v-if="m.remarks && m.winner" class="sf-sc">{{ m.remarks }}</span>
                </div>
              </div>

              <!-- Empty slots -->
              <div v-for="i in Math.max(0, slotsForRound(r) - (matchesByRound[r - 1]?.length || 0))"
                :key="'e' + i" class="s empty-slot">
                <div class="st"><span class="se">—</span></div>
                <div class="sd"></div>
                <div class="st"><span class="se">—</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="ed" class="overlay" @click.self="ed = null">
        <div class="modal">
          <h3>{{ ed.winner ? 'Edit' : 'Set Result' }} — {{ ed.matchId }}</h3>
          <div class="mu">
            <div class="mu-t"><span class="mu-id">{{ ed.team1Id }}</span> {{ name(ed.team1Id) }}</div>
            <div class="mu-vs">VS</div>
            <div class="mu-t"><span class="mu-id">{{ ed.team2Id }}</span> {{ name(ed.team2Id) }}</div>
          </div>
          <div v-if="toast" :class="['toast', toast.ok ? 'ok' : 'err']">{{ toast.msg }}</div>
          <label>Winner
            <div class="wbtns">
              <button :class="['wb', { sel: edWinner === ed.team1Id }]" @click="edWinner = ed.team1Id">
                {{ ed.team1Id }} — {{ short(ed.team1Id) }}
              </button>
              <button :class="['wb', { sel: edWinner === ed.team2Id }]" @click="edWinner = ed.team2Id">
                {{ ed.team2Id }} — {{ short(ed.team2Id) }}
              </button>
            </div>
          </label>
          <label>Score / Remarks <input v-model="edRemarks" placeholder="e.g. 3-1, walkover" /></label>
          <label>Date <input v-model="edDate" placeholder="e.g. 23-Apr" /></label>
          <div class="btns">
            <button class="bc" @click="ed = null">Cancel</button>
            <button class="bs" @click="saveMatch" :disabled="saving || !edWinner">{{ saving ? 'Saving...' : 'Save' }}</button>
          </div>
          <div class="delete-zone">
            <button v-if="!confirmDelete" class="del-btn" @click="confirmDelete = true">🗑 Delete Match</button>
            <div v-else class="del-confirm">
              <span>Are you sure?</span>
              <button class="del-yes" @click="removeMatch" :disabled="saving">Yes, delete</button>
              <button class="del-no" @click="confirmDelete = false">No</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.fix { display: flex; flex-direction: column; gap: 20px; }
.empty { text-align: center; padding: 60px; color: var(--text); background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius); }

.champ {
  display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(234,179,8,0.1), rgba(234,179,8,0.03));
  border: 1px solid rgba(234,179,8,0.2);
}
.ci { font-size: 28px; }
.cl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ca8a04; }
.cn { font-size: 15px; font-weight: 700; color: var(--text-h); }

/* Pair Winners */
.pair-section {
  padding: 16px; border-radius: var(--radius);
  background: var(--card); border: 1px solid var(--green-border);
}
.pair-section.solo { border-color: var(--border); }
.pair-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.pair-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.pair-head h3 { font-size: 12px; margin: 0; color: var(--text); font-weight: 600; }
.pair-list { display: flex; flex-wrap: wrap; gap: 6px; }
.wchip {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: var(--radius-sm);
  background: var(--bg); border: 2px solid var(--border);
  font-size: 12px; transition: all 0.15s;
}
.wchip:hover { border-color: var(--green-border); }
.wchip.selected { border-color: var(--green); background: var(--green-bg); }
.wc-id { font-weight: 800; color: var(--green); font-size: 11px; }
.wc-name { font-weight: 600; color: var(--text-h); }
.wchip.selected .wc-id, .wchip.selected .wc-name { color: var(--green); }

.pair-btn {
  margin-top: 12px; width: 100%; padding: 11px; border-radius: var(--radius-sm); border: none;
  background: var(--green); color: #fff; font-size: 13px; font-weight: 700;
  transition: all 0.2s; box-shadow: 0 2px 10px rgba(16,185,129,0.2);
}
.pair-btn:hover { box-shadow: 0 4px 16px rgba(16,185,129,0.3); }
.pair-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.toast { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.toast.ok { background: var(--green-bg); color: var(--green); }
.toast.err { background: var(--red-bg); color: var(--red); }

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
.s.empty-slot { opacity: 0.2; border-style: dashed; }

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

.delete-zone { border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px; }
.del-btn {
  width: 100%; padding: 8px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 12px; font-weight: 600;
  transition: all 0.15s;
}
.del-btn:hover { background: var(--red-bg); color: var(--red); border-color: rgba(239,68,68,0.2); }
.del-confirm { display: flex; align-items: center; gap: 8px; }
.del-confirm span { font-size: 12px; color: var(--red); font-weight: 600; flex: 1; }
.del-yes {
  padding: 6px 14px; border-radius: 8px; border: none;
  background: var(--red); color: #fff; font-size: 12px; font-weight: 700;
}
.del-yes:disabled { opacity: 0.4; }
.del-no {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 12px; font-weight: 600;
}

@media (max-width: 600px) { .wbtns { flex-direction: column; } }
</style>
