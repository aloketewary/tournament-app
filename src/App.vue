<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue'
import { fetchSheet, type SheetData } from './services/sheetService'
import PlayersTab from './components/PlayersTab.vue'
import CreateMatchTab from './components/CreateMatchTab.vue'
import FixturesTab from './components/FixturesTab.vue'
import ResultsTab from './components/ResultsTab.vue'

const sheetNames = ['TT_Doubles', 'TT_Singles', 'Carrom_Doubles', 'Carrom_Singles', 'Chess', 'Foosball_Doubles', 'Foosball_Singles', 'Dart']
const games = ref<Record<string, SheetData>>({})
const activeGame = ref(sheetNames[0])
const activeView = ref<'fixtures' | 'results' | 'create' | 'players'>('fixtures')
const loading = ref(true)
const error = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const results = await Promise.allSettled(
      sheetNames.map(name => fetchSheet(name).then(data => ({ name, data })))
    )
    for (const r of results) {
      if (r.status === 'fulfilled') games.value[r.value.name] = r.value.data
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to fetch data'
  }
  loading.value = false
}

function displayName(name: string) {
  return name.replace(/_/g, ' ')
}

function gameIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('tt')) return '🏓'
  if (n.includes('carrom')) return '🪙'
  if (n.includes('chess')) return '♟️'
  if (n.includes('badminton')) return '🏸'
  if (n.includes('foosball')) return '⚽'
  if (n.includes('dart')) return '🎯'
  return '🏅'
}

function selectGame(name: string) {
  activeGame.value = name
  nextTick(() => {
    const el = document.querySelector('.game-pill.active') as HTMLElement
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  })
}

const views = [
  { id: 'fixtures' as const, label: 'Fixtures', icon: '📋' },
  { id: 'results' as const, label: 'Results', icon: '🏆' },
  { id: 'create' as const, label: 'Create Match', icon: '⚡' },
  { id: 'players' as const, label: 'Players', icon: '👥' },
]

const teamCount = computed(() => games.value[activeGame.value]?.teams.length || 0)
const matchCount = computed(() => games.value[activeGame.value]?.matches.length || 0)
const completedCount = computed(() => games.value[activeGame.value]?.matches.filter(m => m.winner).length || 0)

onMounted(loadData)
</script>

<template>
  <div class="shell">
    <!-- Header -->
    <header class="header">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-logo">🏆</div>
          <div>
            <h1>Tournament Hub</h1>
            <p class="brand-sub">Office Sports Championship</p>
          </div>
        </div>
        <button class="refresh" @click="loadData" :disabled="loading" title="Refresh data">
          <svg :class="{ spin: loading }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Game Selector -->
    <nav class="games">
      <div class="games-inner">
        <button
          v-for="name in sheetNames" :key="name"
          :class="['game-pill', { active: activeGame === name }]"
          @click="selectGame(name)"
        >
          <span class="gp-icon">{{ gameIcon(name) }}</span>
          <span class="gp-label">{{ displayName(name) }}</span>
        </button>
      </div>
    </nav>

    <!-- View Tabs -->
    <div class="tabs">
      <div class="tabs-inner">
        <button
          v-for="v in views" :key="v.id"
          :class="['tab', { active: activeView === v.id }]"
          @click="activeView = v.id"
        >
          {{ v.label }}
          <span v-if="v.id === 'fixtures' && matchCount" class="tab-badge">{{ matchCount }}</span>
          <span v-if="v.id === 'results' && completedCount" class="tab-badge">{{ completedCount }}</span>
          <span v-if="v.id === 'players' && teamCount" class="tab-badge">{{ teamCount }}</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <main class="main">
      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading tournament data...</p>
      </div>

      <template v-if="!loading && games[activeGame]">
        <PlayersTab v-if="activeView === 'players'" :data="games[activeGame]" :game="activeGame" :key="activeGame" />
        <CreateMatchTab v-if="activeView === 'create'" :data="games[activeGame]" :game="activeGame" :key="activeGame" @refresh="loadData" />
        <FixturesTab v-if="activeView === 'fixtures'" :data="games[activeGame]" :game="activeGame" :key="activeGame" @refresh="loadData" />
        <ResultsTab v-if="activeView === 'results'" :data="games[activeGame]" :game="activeGame" :key="activeGame" @refresh="loadData" />
      </template>
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: flex; flex-direction: column; }

/* Header */
.header {
  background: var(--card); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 50;
}
.header-inner {
  max-width: 1080px; margin: 0 auto; padding: 14px 20px;
  display: flex; justify-content: space-between; align-items: center;
}
.brand { display: flex; align-items: center; gap: 12px; }
.brand-logo {
  font-size: 28px; width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--accent-bg), rgba(99,102,241,0.12));
  border-radius: 12px;
}
.brand h1 { font-size: 18px; margin: 0; }
.brand-sub { font-size: 11px; color: var(--text); margin: 0; font-weight: 500; }
.refresh {
  width: 38px; height: 38px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--card); color: var(--text); display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.refresh:hover { color: var(--accent); border-color: var(--accent-border); background: var(--accent-bg); }
.refresh:disabled { opacity: 0.3; pointer-events: none; }
.spin { animation: spin 0.7s linear infinite; }

/* Games */
.games {
  background: var(--card); border-bottom: 1px solid var(--border);
  position: relative;
}
.games::before, .games::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 40px;
  z-index: 2; pointer-events: none;
}
.games::before { left: 0; background: linear-gradient(to right, var(--card), transparent); }
.games::after { right: 0; background: linear-gradient(to left, var(--card), transparent); }
.games-inner {
  max-width: 1080px; margin: 0 auto; padding: 10px 20px;
  display: flex; gap: 6px; overflow-x: auto;
  scrollbar-width: none; scroll-behavior: smooth;
}
.games-inner::-webkit-scrollbar { display: none; }
.game-pill {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  padding: 7px 14px; border-radius: 100px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text); font-size: 12.5px; font-weight: 600;
  transition: all 0.2s; white-space: nowrap;
}
.game-pill:hover { color: var(--text-h); background: var(--accent-bg); border-color: var(--accent-border); }
.game-pill.active {
  background: var(--accent); color: #fff; border-color: transparent;
  box-shadow: 0 2px 10px rgba(99,102,241,0.25);
}
.gp-icon { font-size: 14px; line-height: 1; }
.gp-label { line-height: 1; }

/* Tabs */
.tabs { background: var(--card); border-bottom: 1px solid var(--border); }
.tabs-inner {
  max-width: 1080px; margin: 0 auto; padding: 0 20px;
  display: flex; gap: 4px;
}
.tab {
  padding: 12px 16px; border: none; background: none;
  color: var(--text); font-size: 13px; font-weight: 600;
  border-bottom: 2px solid transparent;
  transition: all 0.15s; display: flex; align-items: center; gap: 6px;
}
.tab:hover { color: var(--text-h); }
.tab.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-badge {
  font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 8px;
  background: var(--accent-bg); color: var(--accent); line-height: 1.4;
}
.tab.active .tab-badge { background: var(--accent); color: #fff; }

/* Main */
.main {
  max-width: 1080px; width: 100%; margin: 0 auto;
  padding: 20px; flex: 1;
}

.error {
  padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 16px;
  background: var(--red-bg); color: var(--red); font-size: 13px; font-weight: 600;
}

.loading {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 80px 0; color: var(--text); font-size: 13px;
}
.spinner {
  width: 28px; height: 28px; border: 2.5px solid var(--border);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
