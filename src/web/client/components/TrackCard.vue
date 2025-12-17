<script setup lang="ts">
import type { TrackWithDetails } from '../api';
import StatusBadge from './StatusBadge.vue';

const props = defineProps<{
  track: TrackWithDetails;
  allTracks: TrackWithDetails[];
  indent?: number;
}>();

const emit = defineEmits<{
  edit: [track: TrackWithDetails];
  addChild: [parentId: string];
}>();

function getTrackTitle(id: string): string {
  const track = props.allTracks.find((t) => t.id === id);
  return track?.title || id;
}
</script>

<template>
  <div :class="['bg-white rounded-lg shadow p-4', indent && indent > 0 ? 'ml-6 border-l-2 border-gray-200' : '']">
    <div class="flex items-start justify-between">
      <div class="flex-1 min-w-0">
        <!-- Header row -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-gray-400 font-mono">{{ track.id }}</span>
          <StatusBadge :status="track.status" />
          <span class="text-xs text-gray-400">[{{ track.kind }}]</span>
          <span v-if="track.worktree" class="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
            @{{ track.worktree }}
          </span>
        </div>

        <!-- Title -->
        <h3 :class="['font-semibold mt-1', indent === 0 ? 'text-lg' : 'text-base']">
          {{ track.title }}
        </h3>

        <!-- Summary -->
        <p v-if="track.summary" class="text-gray-600 text-sm mt-1">
          {{ track.summary }}
        </p>

        <!-- Next prompt -->
        <p v-if="track.next_prompt" class="text-gray-500 text-sm mt-1 italic">
          <span class="font-medium not-italic">Next:</span> {{ track.next_prompt }}
        </p>

        <!-- Files -->
        <div v-if="track.files.length > 0" class="mt-2 flex flex-wrap gap-1">
          <span class="text-xs text-gray-400">Files:</span>
          <span
            v-for="file in track.files"
            :key="file"
            class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono"
          >
            {{ file }}
          </span>
        </div>

        <!-- Dependencies -->
        <div v-if="track.blocks.length > 0" class="mt-1">
          <span class="text-xs text-blue-600">
            Blocks: {{ track.blocks.map(getTrackTitle).join(', ') }}
          </span>
        </div>
        <div v-if="track.blocked_by.length > 0" class="mt-1">
          <span class="text-xs text-yellow-600">
            Blocked by: {{ track.blocked_by.map(getTrackTitle).join(', ') }}
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 ml-4 flex-shrink-0">
        <button
          @click="emit('edit', track)"
          class="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
        >
          Edit
        </button>
        <button
          @click="emit('addChild', track.id)"
          class="text-sm text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded"
        >
          + Child
        </button>
      </div>
    </div>
  </div>
</template>
