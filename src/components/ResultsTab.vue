<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SheetData, MatchData } from '../services/sheetService'
import { updateMatch } from '../services/sheetService'

const props = defineProps<{ data: SheetData, game: string }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const completed = computed(() => props.data.matches.filter(m => m.winner))
const upcoming = computed(() => props.data.matches.filter(m => !m.winner))

function name(id: string) {
  const t = props.data.teams.find(t => t.id === id)
  return t ? t.players.map(p => p.name).join(' & ') : id
}
function short(id: string) {
  const t = props.data.teams.find(t => t.id === id)
  return t ? t.players.map(p => p.name.split(' ')[0]).join(' & ') : id
}

const ed = ref<MatchData | null>(null)
const edWinner = ref('')
const edDate = ref('')
const edRemarks = ref('')
const saving = ref(false)
const toast = ref<{ ok: boolean, msg: string } | null>(null)

function open(m: MatchData) {
  ed.value = m; edWinner.value = m.winner; edDate.value = m.scheduledDate; edRemarks.value = m.remarks
}

async function save() {
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
</script>

<template>
  <div class="results-tab">

    <!-- Empty -->
    <div v-if="!completed.length && !upcoming.length" class="empty">
      <p>🏆 No matches played yet</p>
    </div>

    <!-- Stats -->
    <div v-if="completed.length" class="stats">
      <div class="stat">
        <span class="stat-num">{{ completed.length }}</span>
        <span class="stat-lbl">Completed</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ upcoming.length }}</span>
        <span class="stat-lbl">Remaining</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ data.teams.length }}</span>
        <span class="stat-lbl">Teams</span>
      </div>
    </div>

    <!-- Completed matches -->
    <div v-if="completed.length" class="list">
      <div v-for="m in completed" :key="m.matchId" class="row" @click="open(m)">
        <div class="row-left">
          <span class="row-id">{{ m.matchId }}</span>
          <div class="row-teams">
            <span :class="['rt', { won: m.winner === m.team1Id, lost: m.winner !== m.team1Id }]">
              <b>{{ m.team1Id }}</b> {{ short(m.team1Id) }}
            </span>
            <span class="row-vs">vs</span>
            <span :class="['rt', { won: m.winner === m.team2Id, lost: m.winner !== m.team2Id }]">
              <b>{{ m.team2Id }}</b> {{ short(m.team2Id) }}
            </span>
          </div>
        </div>
        <div class="row-right">
          <span v-if="m.remarks" class="row-score">{{ m.remarks }}</span>
          <span class="row-winner">🏆 {{ m.winner }}</span>
          <span v-if="m.scheduledDate" class="row-date">{{ m.scheduledDate }}</span>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
      <div v-if="ed" class="overlay" @click.self="ed = null">
        <div class="modal">
          <h3>Edit Result — {{ ed.matchId }}</h3>
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
            <button class="bs" @click="save" :disabled="saving">{{ saving ? 'Saving...' : 'Update' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.results-tab { display: flex; flex-direction: column; gap: 20px; }

.empty {
  text-align: center; padding: 60px; color: var(--text); font-size: 14px;
  background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius);
}

/* Stats */
.stats { display: flex; gap: 8px; }
.stat {
  flex: 1; padding: 14px 16px; border-radius: var(--radius-sm);
  background: var(--card); border: 1px solid var(--border);
  display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.stat-num { font-size: 22px; font-weight: 800; color: var(--text-h); }
.stat-lbl { font-size: 11px; font-weight: 600; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px; }

/* List */
.list { display: flex; flex-direction: column; gap: 6px; }
.row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px; border-radius: var(--radius-sm);
  background: var(--card); border: 1px solid var(--border);
  border-left: 3px solid var(--green); cursor: pointer; transition: all 0.15s;
}
.row:hover { box-shadow: var(--shadow-md); border-color: var(--green-border); }
.row-left { display: flex; align-items: center; gap: 12px; }
.row-id { font-size: 11px; font-weight: 700; color: var(--text); min-width: 28px; }
.row-teams { display: flex; align-items: center; gap: 6px; }
.rt { font-size: 13px; color: var(--text-h); }
.rt b { color: var(--accent); font-size: 11px; margin-right: 2px; }
.rt.won { font-weight: 700; color: var(--green); }
.rt.won b { color: var(--green); }
.rt.lost { opacity: 0.4; }
.row-vs { font-size: 10px; color: var(--text); font-weight: 700; }
.row-right { display: flex; align-items: center; gap: 10px; }
.row-score {
  font-size: 11px; font-weight: 700; color: var(--accent);
  background: var(--accent-bg); padding: 2px 8px; border-radius: 6px;
}
.row-winner { font-size: 12px; color: var(--green); font-weight: 600; }
.row-date { font-size: 11px; color: var(--text); }

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

@media (max-width: 600px) {
  .wbtns { flex-direction: column; }
  .row { flex-direction: column; align-items: flex-start; }
  .row-right { flex-wrap: wrap; }
}
</style>
