<script setup lang="ts">
import { computed } from 'vue'
import type { SheetData } from '../services/sheetService'

const props = defineProps<{ data: SheetData, game: string }>()
const isDoubles = computed(() => props.game.toLowerCase().includes('double'))
</script>

<template>
  <div class="players">
    <div class="head">
      <h2>{{ isDoubles ? 'Teams' : 'Players' }}</h2>
      <span class="count">{{ data.teams.length }}</span>
    </div>

    <div class="grid">
      <div v-for="team in data.teams" :key="team.id" class="card">
        <div class="card-badge">{{ team.id }}</div>
        <div class="card-body">
          <div class="names">
            <template v-for="(p, j) in team.players" :key="p.name">
              <span class="name">{{ p.name }}</span>
              <span v-if="j < team.players.length - 1" class="sep">&</span>
            </template>
          </div>
          <div v-if="team.days.length || team.remarks" class="tags">
            <span v-for="d in team.days" :key="d" class="tag accent">{{ d }}</span>
            <span v-if="team.remarks" class="tag blue">{{ team.remarks }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="data.withdrawn.length" class="section">
      <h3>Withdrawn</h3>
      <div class="chips">
        <span v-for="p in data.withdrawn" :key="p.name" class="chip red">{{ p.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.players { display: flex; flex-direction: column; gap: 20px; }
.head { display: flex; align-items: center; gap: 10px; }
.head h2 { font-size: 16px; margin: 0; }
.count {
  font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 8px;
  background: var(--accent-bg); color: var(--accent);
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.card {
  display: flex; gap: 12px; padding: 12px 14px;
  background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-sm);
  transition: all 0.15s;
}
.card:hover { box-shadow: var(--shadow-md); border-color: var(--accent-border); }
.card-badge {
  font-size: 10px; font-weight: 800; color: var(--accent);
  background: var(--accent-bg); border-radius: 8px;
  min-width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.card-body { flex: 1; min-width: 0; }
.names { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.name { font-weight: 600; color: var(--text-h); font-size: 13px; }
.sep { color: var(--accent); font-weight: 700; font-size: 11px; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.tag { font-size: 10px; padding: 2px 7px; border-radius: 6px; font-weight: 600; }
.tag.accent { background: var(--accent-bg); color: var(--accent); }
.tag.blue { background: rgba(59,130,246,0.06); color: #3b82f6; }

.section { padding-top: 16px; border-top: 1px solid var(--border); }
.section h3 { font-size: 12px; color: var(--text); margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; }
.chip.red { background: var(--red-bg); color: var(--red); }
</style>
