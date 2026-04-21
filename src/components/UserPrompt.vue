<script setup lang="ts">
import { ref } from 'vue'
import { getUser, setUser } from '../services/sheetService'

const emit = defineEmits<{ (e: 'confirmed'): void }>()
const name = ref(getUser())
const error = ref('')

function confirm() {
  if (!name.value.trim()) { error.value = 'Please enter your name'; return }
  setUser(name.value)
  error.value = ''
  emit('confirmed')
}
</script>

<template>
  <div class="overlay" @click.self="$emit('confirmed')">
    <div class="prompt">
      <h3>👤 Who's updating?</h3>
      <p>Your name will be recorded in the sheet</p>
      <input
        v-model="name"
        placeholder="Enter your name"
        @keyup.enter="confirm"
        autofocus
      />
      <span v-if="error" class="err">{{ error }}</span>
      <button class="go" @click="confirm">Continue</button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; z-index: 200;
}
.prompt {
  background: var(--card); border: 1px solid var(--border); border-radius: 18px;
  padding: 28px; width: 340px; max-width: 90vw; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; gap: 12px; text-align: center;
}
.prompt h3 { font-size: 16px; margin: 0; }
.prompt p { font-size: 12px; color: var(--text); margin: 0; }
.prompt input {
  padding: 11px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg); color: var(--text-h); font-size: 14px; font-family: inherit;
  text-align: center;
}
.prompt input:focus { outline: none; border-color: var(--accent); }
.err { font-size: 12px; color: var(--red); }
.go {
  padding: 11px; border-radius: var(--radius-sm); border: none;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 700;
}
.go:hover { opacity: 0.9; }
</style>
