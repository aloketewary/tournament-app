<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SheetData, Team } from '../services/sheetService'
import { addMatch } from '../services/sheetService'

const props = defineProps<{ data: SheetData, game: string }>()
const emit = defineEmits<{ (e: 'refresh'): void }>()

const slot1 = ref<Team | null>(null)
const slot2 = ref<Team | null>(null)
const showModal = ref(false)
const date = ref('')
const remarks = ref('')
const saving = ref(false)
const dragOver = ref<1 | 2 | null>(null)
const toast = ref<{ ok: boolean, msg: string } | null>(null)

const pool = computed(() => props.data.teams.filter(t => t !== slot1.value && t !== slot2.value))

function label(t: Team) { return t.players.map(p => p.name).join(' & ') }

function matchCount(teamId: string): number {
  return props.data.matches.filter(m => m.team1Id === teamId || m.team2Id === teamId).length
}

function onDragStart(e: DragEvent, t: Team) { e.dataTransfer!.setData('id', t.id) }
function onDrop(e: DragEvent, s: 1 | 2) {
  e.preventDefault(); dragOver.value = null
  const t = props.data.teams.find(x => x.id === e.dataTransfer!.getData('id'))
  if (!t) return
  if (s === 1 && slot2.value?.id === t.id) slot2.value = null
  if (s === 2 && slot1.value?.id === t.id) slot1.value = null
  if (s === 1) slot1.value = t; else slot2.value = t
}
function click(t: Team) {
  if (!slot1.value) slot1.value = t
  else if (!slot2.value && t.id !== slot1.value.id) slot2.value = t
}

async function confirm() {
  if (!slot1.value || !slot2.value) return
  saving.value = true
  try {
    const r = await addMatch(props.game, slot1.value.id, slot2.value.id, date.value, remarks.value)
    if (r.success) {
      toast.value = { ok: true, msg: `${r.matchId} created` }
      slot1.value = null; slot2.value = null; showModal.value = false
      emit('refresh')
    } else toast.value = { ok: false, msg: r.error || 'Failed' }
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
  setTimeout(() => toast.value = null, 3000)
}
</script>

<template>
  <div class="create">
    <div class="head">
      <h2>Create Match</h2>
      <span class="hint">Drag or click teams</span>
    </div>

    <div v-if="toast" :class="['toast', toast.ok ? 'ok' : 'err']">{{ toast.msg }}</div>

    <div class="arena">
      <div :class="['drop', { filled: slot1, over: dragOver === 1 }]"
        @dragover.prevent="dragOver = 1" @dragleave="dragOver = null" @drop="onDrop($event, 1)">
        <template v-if="slot1">
          <div class="drop-info">
            <span class="drop-id">{{ slot1.id }}</span>
            <span class="drop-name">{{ label(slot1) }}</span>
          </div>
          <button class="drop-x" @click="slot1 = null">×</button>
        </template>
        <div v-else class="drop-ph"><span class="plus">+</span>Team 1</div>
      </div>

      <div class="vs-circle">VS</div>

      <div :class="['drop', { filled: slot2, over: dragOver === 2 }]"
        @dragover.prevent="dragOver = 2" @dragleave="dragOver = null" @drop="onDrop($event, 2)">
        <template v-if="slot2">
          <div class="drop-info">
            <span class="drop-id">{{ slot2.id }}</span>
            <span class="drop-name">{{ label(slot2) }}</span>
          </div>
          <button class="drop-x" @click="slot2 = null">×</button>
        </template>
        <div v-else class="drop-ph"><span class="plus">+</span>Team 2</div>
      </div>
    </div>

    <button :class="['go-btn', { ready: slot1 && slot2 }]" :disabled="!slot1 || !slot2"
      @click="date = ''; remarks = ''; showModal = true">
      Schedule Match →
    </button>

    <div class="pool">
      <div v-for="t in pool" :key="t.id" class="pill" draggable="true"
        @dragstart="onDragStart($event, t)" @click="click(t)">
        <span class="pill-id">{{ t.id }}</span>
        <span class="pill-name">{{ label(t) }}</span>
        <span v-if="matchCount(t.id)" class="pill-matches">{{ matchCount(t.id) }}m</span>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showModal" class="overlay" @click.self="showModal = false">
        <div class="modal">
          <h3>Confirm Match</h3>
          <div class="mu">
            <span class="mu-t"><b>{{ slot1?.id }}</b> {{ slot1 ? label(slot1) : '' }}</span>
            <span class="mu-vs">VS</span>
            <span class="mu-t"><b>{{ slot2?.id }}</b> {{ slot2 ? label(slot2) : '' }}</span>
          </div>
          <label>Date <input v-model="date" placeholder="e.g. 23-Apr" /></label>
          <label>Remarks <input v-model="remarks" placeholder="Optional" /></label>
          <div class="btns">
            <button class="btn-c" @click="showModal = false">Cancel</button>
            <button class="btn-s" @click="confirm" :disabled="saving">{{ saving ? 'Saving...' : 'Confirm' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.create { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; align-items: baseline; gap: 10px; }
.head h2 { font-size: 16px; margin: 0; }
.hint { font-size: 12px; color: var(--text); }

.toast { padding: 10px 14px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 600; }
.toast.ok { background: var(--green-bg); color: var(--green); }
.toast.err { background: var(--red-bg); color: var(--red); }

.arena { display: flex; align-items: stretch; position: relative; }
.drop {
  flex: 1; min-height: 90px; padding: 16px;
  border: 2px dashed var(--border); background: var(--card); border-radius: var(--radius);
  display: flex; align-items: center; justify-content: space-between; transition: all 0.2s;
}
.drop:first-child { border-radius: var(--radius) 0 0 var(--radius); }
.drop:last-child { border-radius: 0 var(--radius) var(--radius) 0; }
.drop.over { border-color: var(--accent); background: var(--accent-bg); }
.drop.filled { border-style: solid; border-color: var(--accent-border); background: var(--accent-bg); }
.drop-ph { width: 100%; text-align: center; color: var(--text); font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.plus { font-size: 22px; color: var(--border); font-weight: 300; display: block; }
.drop-info { display: flex; align-items: center; gap: 8px; }
.drop-id { font-size: 11px; font-weight: 800; color: var(--accent); background: rgba(99,102,241,0.12); padding: 3px 8px; border-radius: 6px; }
.drop-name { font-weight: 600; color: var(--text-h); font-size: 13px; }
.drop-x { background: none; border: none; font-size: 18px; color: var(--text); padding: 2px 6px; border-radius: 6px; line-height: 1; }
.drop-x:hover { background: var(--red-bg); color: var(--red); }
.vs-circle {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 1;
  font-size: 11px; font-weight: 800; color: #fff; background: var(--accent);
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}

.go-btn {
  width: 100%; padding: 13px; border-radius: var(--radius-sm); border: none;
  background: var(--border); color: var(--text); font-size: 13px; font-weight: 700; transition: all 0.2s;
}
.go-btn.ready { background: var(--accent); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.2); }
.go-btn.ready:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.3); }
.go-btn:disabled { cursor: not-allowed; }

.pool { display: flex; flex-wrap: wrap; gap: 6px; }
.pill {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 100px;
  background: var(--card); border: 1px solid var(--border);
  cursor: grab; transition: all 0.15s; user-select: none; font-size: 12px;
}
.pill:hover { border-color: var(--accent-border); box-shadow: var(--shadow); }
.pill:active { cursor: grabbing; }
.pill-id { font-size: 10px; font-weight: 800; color: var(--accent); }
.pill-name { font-weight: 600; color: var(--text-h); }
.pill-matches {
  font-size: 9px; font-weight: 700; color: var(--accent);
  background: var(--accent-bg); padding: 1px 6px; border-radius: 6px;
}

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal {
  background: var(--card); border: 1px solid var(--border); border-radius: 18px;
  padding: 24px; width: 380px; max-width: 90vw; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; gap: 14px;
}
.modal h3 { font-size: 15px; margin: 0; }
.mu { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px; border-radius: var(--radius-sm); background: var(--bg); }
.mu-t { font-size: 13px; color: var(--text-h); }
.mu-t b { color: var(--accent); }
.mu-vs { font-size: 11px; font-weight: 800; color: var(--accent); }
.modal label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 600; color: var(--text); }
.modal input {
  padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text-h); font-size: 13px; font-family: inherit;
}
.modal input:focus { outline: none; border-color: var(--accent); }
.btns { display: flex; gap: 8px; }
.btn-c { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-weight: 600; font-size: 13px; }
.btn-s { flex: 2; padding: 10px; border-radius: 8px; border: none; background: var(--accent); color: #fff; font-weight: 600; font-size: 13px; }
.btn-s:disabled { opacity: 0.4; }

@media (max-width: 600px) {
  .arena { flex-direction: column; }
  .drop:first-child { border-radius: var(--radius) var(--radius) 0 0; }
  .drop:last-child { border-radius: 0 0 var(--radius) var(--radius); }
  .vs-circle { position: static; transform: none; margin: -18px auto; }
}
</style>
