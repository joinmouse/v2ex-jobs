<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Job = {
  id: number;
  v2ex_id: number;
  title: string;
  content: string;
  author: string;
  created_at: number;
  city: string | null;
  tech_stack: string;
  is_remote: number;
  salary: string | null;
  fetched_at: number;
};

const jobs = ref<Job[]>([]);
const loading = ref(true);
const error = ref('');
const total = ref(0);
const page = ref(1);
const limit = 20;

// Filters
const cities = ref<string[]>([]);
const selectedCity = ref('');
const selectedTech = ref('');
const remoteOnly = ref(false);

const TECH_FILTERS = ['React', 'Vue', 'Go', 'Python', 'Java', 'Rust', 'Node.js', 'TypeScript', 'AI'];

const lastFetchTime = ref('');

async function loadFilters(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/filters`);
    if (res.ok) {
      const data = await res.json();
      cities.value = data.cities ?? [];
    }
  } catch {
    // ignore
  }
}

async function loadJobs(): Promise<void> {
  loading.value = true;
  error.value = '';

  const params = new URLSearchParams();
  params.set('page', String(page.value));
  params.set('limit', String(limit));
  if (selectedCity.value) params.set('city', selectedCity.value);
  if (selectedTech.value) params.set('tech', selectedTech.value);
  if (remoteOnly.value) params.set('remote', '1');

  try {
    const res = await fetch(`${API_BASE}/api/jobs?${params}`);
    if (!res.ok) throw new Error(`请求失败 ${res.status}`);
    const data = await res.json();
    jobs.value = data.data ?? [];
    total.value = data.total ?? 0;
    lastFetchTime.value = new Date().toLocaleString('zh-CN', { hour12: false });
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

function parseTechStack(raw: string): string[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const totalPages = computed(() => Math.ceil(total.value / limit));

function selectCity(city: string): void {
  selectedCity.value = selectedCity.value === city ? '' : city;
  page.value = 1;
}

function selectTech(tech: string): void {
  selectedTech.value = selectedTech.value === tech ? '' : tech;
  page.value = 1;
}

function toggleRemote(): void {
  remoteOnly.value = !remoteOnly.value;
  page.value = 1;
}

watch([selectedCity, selectedTech, remoteOnly, page], () => {
  void loadJobs();
});

onMounted(() => {
  void loadFilters();
  void loadJobs();
});
</script>

<template>
  <main class="page-shell">
    <section class="hero">
      <h1>V2EX 酷工作</h1>
      <p class="intro">自动聚合 V2EX 招聘帖，支持按城市、技术栈、远程筛选。</p>
      <div class="meta-row">
        <span v-if="lastFetchTime">更新时间：{{ lastFetchTime }}</span>
        <span v-if="total"> · 共 {{ total }} 条</span>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-row">
        <span class="filter-label">城市</span>
        <button
          v-for="city in cities.slice(0, 10)"
          :key="city"
          :class="['filter-tag', { active: selectedCity === city }]"
          type="button"
          @click="selectCity(city)"
        >
          {{ city }}
        </button>
      </div>
      <div class="filter-row">
        <span class="filter-label">技术栈</span>
        <button
          v-for="tech in TECH_FILTERS"
          :key="tech"
          :class="['filter-tag', { active: selectedTech === tech }]"
          type="button"
          @click="selectTech(tech)"
        >
          {{ tech }}
        </button>
      </div>
      <div class="filter-row">
        <label class="remote-toggle">
          <input type="checkbox" :checked="remoteOnly" @change="toggleRemote" />
          仅看远程
        </label>
      </div>
    </section>

    <section aria-live="polite">
      <div v-if="loading" class="state-card" role="status">
        <span class="loader" aria-hidden="true"></span>
        <span>加载中...</span>
      </div>

      <div v-else-if="error" class="state-card error-card" role="alert">
        <strong>加载失败</strong>
        <p>{{ error }}</p>
        <button type="button" @click="loadJobs">重试</button>
      </div>

      <div v-else-if="jobs.length === 0" class="state-card">暂无符合条件的招聘帖。</div>

      <ul v-else class="job-list">
        <li v-for="job in jobs" :key="job.id" class="job-card">
          <h2 class="job-title">
            <a :href="`https://www.v2ex.com/t/${job.v2ex_id}`" target="_blank" rel="noreferrer noopener">
              {{ job.title }}
            </a>
          </h2>
          <div class="job-meta">
            <span v-if="job.city" class="job-city">{{ job.city }}</span>
            <span v-if="job.is_remote" class="job-remote">远程</span>
            <span v-if="job.salary" class="job-salary">{{ job.salary }}</span>
            <span class="job-author">{{ job.author }}</span>
          </div>
          <div v-if="parseTechStack(job.tech_stack).length" class="job-techs">
            <span v-for="tech in parseTechStack(job.tech_stack)" :key="tech" class="tech-tag">{{ tech }}</span>
          </div>
          <div class="job-time">{{ formatTime(job.created_at) }}</div>
        </li>
      </ul>

      <div v-if="!loading && !error && totalPages > 1" class="pagination">
        <button type="button" :disabled="page <= 1" @click="page--">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button type="button" :disabled="page >= totalPages" @click="page++">下一页</button>
      </div>
    </section>
  </main>
</template>
