<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchStatus, createTrack, updateTrack } from './api';
import type { TrackWithDetails, CreateTrackParams, UpdateTrackParams, Status } from './api';
import TrackTree from './components/TrackTree.vue';
import TrackForm from './components/TrackForm.vue';

const tracks = ref<TrackWithDetails[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const showForm = ref(false);
const editingTrack = ref<TrackWithDetails | null>(null);
const newTrackParentId = ref<string | null>(null);

async function loadTracks() {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetchStatus();
    tracks.value = response.tracks;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load tracks';
  } finally {
    loading.value = false;
  }
}

function openCreateForm(parentId: string | null = null) {
  editingTrack.value = null;
  newTrackParentId.value = parentId;
  showForm.value = true;
}

function openEditForm(track: TrackWithDetails) {
  editingTrack.value = track;
  newTrackParentId.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  editingTrack.value = null;
  newTrackParentId.value = null;
}

async function handleFormSubmit(data: {
  title?: string;
  summary: string;
  next_prompt: string;
  status: Status;
  parent_id?: string | null;
}) {
  try {
    if (editingTrack.value) {
      const params: UpdateTrackParams = {
        summary: data.summary,
        next_prompt: data.next_prompt,
        status: data.status,
      };
      await updateTrack(editingTrack.value.id, params);
    } else {
      const params: CreateTrackParams = {
        title: data.title!,
        summary: data.summary,
        next_prompt: data.next_prompt,
        status: data.status,
        parent_id: data.parent_id,
      };
      await createTrack(params);
    }
    closeForm();
    await loadTracks();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save track';
  }
}

onMounted(() => {
  loadTracks();
});
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">Track Status</h1>
      <p class="text-gray-600 mt-1">Project tracking dashboard</p>
    </header>

    <!-- Error display -->
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
      <button @click="error = null" class="float-right font-bold">&times;</button>
    </div>

    <!-- Action bar -->
    <div class="mb-6 flex items-center gap-4">
      <button
        @click="openCreateForm(null)"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
      >
        + New Track
      </button>
      <button
        @click="loadTracks"
        :disabled="loading"
        class="text-gray-600 hover:text-gray-800 px-4 py-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
      >
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <!-- Track tree (kept mounted to preserve filter/expanded state) -->
    <TrackTree
      :tracks="tracks"
      :loading="loading"
      @edit="openEditForm"
      @add-child="openCreateForm"
    />

    <!-- Form modal -->
    <TrackForm
      v-if="showForm"
      :track="editingTrack"
      :parent-id="newTrackParentId"
      :all-tracks="tracks"
      @submit="handleFormSubmit"
      @cancel="closeForm"
    />
  </div>
</template>
