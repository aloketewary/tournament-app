<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchRules, addRule, updateRule, deleteRule, hasUser, type Rule } from '../services/sheetService'

const props = defineProps<{ game: string }>()
const emit = defineEmits<{ (e: 'needUser'): void }>()

const allRules = ref<Rule[]>([])
const loading = ref(true)
const saving = ref(false)
const toast = ref<{ ok: boolean, msg: string } | null>(null)

const rules = computed(() => allRules.value.filter(r => r.game === props.game))

// Add
const newRule = ref('')

// Edit
const editIdx = ref(-1)
const editText = ref('')

// Delete confirm
const deleteIdx = ref(-1)

async function load() {
  loading.value = true
  allRules.value = await fetchRules()
  loading.value = false
}

function checkUser(): boolean {
  if (!hasUser()) { emit('needUser'); return false }
  return true
}

async function add() {
  if (!newRule.value.trim() || !checkUser()) return
  saving.value = true; toast.value = null
  try {
    const r = await addRule(props.game, newRule.value.trim())
    if (r.success) {
      toast.value = { ok: true, msg: 'Rule added!' }
      newRule.value = ''
      await load()
    } else toast.value = { ok: false, msg: 'Failed' }
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
  setTimeout(() => toast.value = null, 3000)
}

function startEdit(i: number) {
  if (!checkUser()) return
  editIdx.value = i
  editText.value = rules.value[i].rule
}

async function saveEdit() {
  if (editIdx.value < 0 || !editText.value.trim()) return
  saving.value = true; toast.value = null
  const old = rules.value[editIdx.value].rule
  try {
    const r = await updateRule(props.game, old, editText.value.trim())
    if (r.success) {
      toast.value = { ok: true, msg: 'Updated!' }
      editIdx.value = -1
      await load()
    } else toast.value = { ok: false, msg: 'Failed' }
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
  setTimeout(() => toast.value = null, 3000)
}

async function confirmDelete() {
  if (deleteIdx.value < 0 || !checkUser()) return
  saving.value = true; toast.value = null
  try {
    const r = await deleteRule(props.game, rules.value[deleteIdx.value].rule)
    if (r.success) {
      toast.value = { ok: true, msg: 'Deleted!' }
      deleteIdx.value = -1
      await load()
    } else toast.value = { ok: false, msg: 'Failed' }
  } catch (e: any) { toast.value = { ok: false, msg: e.message } }
  saving.value = false
  setTimeout(() => toast.value = null, 3000)
}

onMounted(load)
</script>

<template>
  <div class="rules-tab">
    <div class="head">
      <h2>Rules</h2>
      <span class="count" v-if="rules.length">{{ rules.length }}</span>
    </div>

    <div v-if="toast" :class="['toast', toast.ok ? 'ok' : 'err']">{{ toast.msg }}</div>

    <div v-if="loading" class="loading">Loading rules...</div>

    <!-- Add rule -->
    <div class="add-row">
      <input
        v-model="newRule"
        placeholder="Add a new rule..."
        @keyup.enter="add"
        :disabled="saving"
      />
      <button class="add-btn" @click="add" :disabled="!newRule.trim() || saving">+ Add</button>
    </div>

    <!-- Rules list -->
    <div v-if="rules.length" class="list">
      <div v-for="(r, i) in rules" :key="i" class="rule-row">
        <span class="rule-num">{{ i + 1 }}</span>

        <template v-if="editIdx === i">
          <input class="edit-input" v-model="editText" @keyup.enter="saveEdit" autofocus />
          <button class="save-btn" @click="saveEdit" :disabled="saving">✓</button>
          <button class="cancel-btn" @click="editIdx = -1">✕</button>
        </template>

        <template v-else-if="deleteIdx === i">
          <span class="rule-text del">{{ r.rule }}</span>
          <span class="del-msg">Delete?</span>
          <button class="del-yes" @click="confirmDelete" :disabled="saving">Yes</button>
          <button class="del-no" @click="deleteIdx = -1">No</button>
        </template>

        <template v-else>
          <span class="rule-text">{{ r.rule }}</span>
          <div class="rule-actions">
            <button class="act-btn" @click="startEdit(i)" title="Edit">✏️</button>
            <button class="act-btn" @click="deleteIdx = i" title="Delete">🗑</button>
          </div>
        </template>
      </div>
    </div>

    <div v-else-if="!loading" class="empty">
      <p>📜 No rules added yet for this game</p>
    </div>
  </div>
</template>

<style scoped>
.rules-tab { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; align-items: center; gap: 10px; }
.head h2 { font-size: 16px; margin: 0; }
.count {
  font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 8px;
  background: var(--accent-bg); color: var(--accent);
}

.toast { padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.toast.ok { background: var(--green-bg); color: var(--green); }
.toast.err { background: var(--red-bg); color: var(--red); }

.loading { padding: 40px; text-align: center; color: var(--text); font-size: 13px; }

/* Add */
.add-row { display: flex; gap: 8px; }
.add-row input {
  flex: 1; padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--card); color: var(--text-h); font-size: 13px; font-family: inherit;
}
.add-row input:focus { outline: none; border-color: var(--accent); }
.add-btn {
  padding: 10px 18px; border-radius: var(--radius-sm); border: none;
  background: var(--accent); color: #fff; font-size: 13px; font-weight: 700;
  white-space: nowrap; transition: all 0.15s;
}
.add-btn:hover { opacity: 0.9; }
.add-btn:disabled { opacity: 0.35; cursor: not-allowed; }

/* List */
.list { display: flex; flex-direction: column; gap: 4px; }
.rule-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: var(--radius-sm);
  background: var(--card); border: 1px solid var(--border);
  transition: all 0.15s;
}
.rule-row:hover { border-color: var(--accent-border); }
.rule-num {
  font-size: 11px; font-weight: 800; color: var(--accent);
  background: var(--accent-bg); border-radius: 6px;
  min-width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rule-text { flex: 1; font-size: 13px; color: var(--text-h); font-weight: 500; }
.rule-text.del { opacity: 0.4; text-decoration: line-through; }

.rule-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.rule-row:hover .rule-actions { opacity: 1; }
.act-btn {
  background: none; border: none; font-size: 14px; padding: 2px 6px;
  border-radius: 6px; transition: all 0.15s;
}
.act-btn:hover { background: var(--accent-bg); }

/* Edit */
.edit-input {
  flex: 1; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--accent);
  background: var(--bg); color: var(--text-h); font-size: 13px; font-family: inherit;
}
.edit-input:focus { outline: none; }
.save-btn {
  padding: 4px 10px; border-radius: 6px; border: none;
  background: var(--green); color: #fff; font-size: 13px; font-weight: 700;
}
.cancel-btn {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 13px;
}

/* Delete confirm */
.del-msg { font-size: 12px; color: var(--red); font-weight: 600; }
.del-yes {
  padding: 4px 10px; border-radius: 6px; border: none;
  background: var(--red); color: #fff; font-size: 12px; font-weight: 700;
}
.del-yes:disabled { opacity: 0.4; }
.del-no {
  padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--card); color: var(--text); font-size: 12px;
}

.empty {
  text-align: center; padding: 40px; color: var(--text); font-size: 14px;
  background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius);
}
</style>
