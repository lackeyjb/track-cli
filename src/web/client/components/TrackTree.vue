<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TrackWithDetails, Status } from '../api';
import TrackCard from './TrackCard.vue';

const props = defineProps<{
  tracks: TrackWithDetails[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  edit: [track: TrackWithDetails];
  addChild: [parentId: string | null];
}>();

// Expansion state
const expandedIds = ref<Set<string>>(new Set());

// Status filter
const statusFilters = ref<Set<Status>>(new Set(['planned', 'in_progress', 'blocked']));

const allStatuses: { value: Status; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'superseded', label: 'Superseded' },
];

function toggleStatus(status: Status) {
  if (statusFilters.value.has(status)) {
    statusFilters.value.delete(status);
  } else {
    statusFilters.value.add(status);
  }
  // Force reactivity
  statusFilters.value = new Set(statusFilters.value);
}

function selectAllStatuses() {
  statusFilters.value = new Set(allStatuses.map((s) => s.value));
}

function selectActiveStatuses() {
  statusFilters.value = new Set(['planned', 'in_progress', 'blocked']);
}

// Filter tracks by status
const filteredTracks = computed(() => {
  if (statusFilters.value.size === 0) return props.tracks;
  return props.tracks.filter((t) => statusFilters.value.has(t.status));
});

// Get root tracks
const rootTracks = computed(() => {
  return filteredTracks.value.filter((t) => t.parent_id === null);
});

// Get children of a track
function getChildren(parentId: string): TrackWithDetails[] {
  return filteredTracks.value.filter((t) => t.parent_id === parentId);
}

// Check if track has visible children
function hasChildren(trackId: string): boolean {
  return filteredTracks.value.some((t) => t.parent_id === trackId);
}

// Toggle expand/collapse
function toggleExpand(trackId: string) {
  if (expandedIds.value.has(trackId)) {
    expandedIds.value.delete(trackId);
  } else {
    expandedIds.value.add(trackId);
  }
  // Force reactivity
  expandedIds.value = new Set(expandedIds.value);
}

function isExpanded(trackId: string): boolean {
  return expandedIds.value.has(trackId);
}

// Expand all
function expandAll() {
  const ids = new Set<string>();
  props.tracks.forEach((t) => {
    if (hasChildren(t.id)) {
      ids.add(t.id);
    }
  });
  expandedIds.value = ids;
}

// Collapse all
function collapseAll() {
  expandedIds.value = new Set();
}
</script>

<template>
  <div :class="{ 'opacity-50 pointer-events-none': loading }">
    <!-- Filters and controls -->
    <div class="mb-4 flex flex-wrap items-center gap-4">
      <!-- Status filters -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Filter:</span>
        <button
          v-for="s in allStatuses"
          :key="s.value"
          @click="toggleStatus(s.value)"
          :class="[
            'text-xs px-2 py-1 rounded border transition-colors',
            statusFilters.has(s.value)
              ? 'bg-blue-100 border-blue-300 text-blue-800'
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100',
          ]"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- Quick filter buttons -->
      <div class="flex items-center gap-2">
        <button
          @click="selectActiveStatuses"
          class="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Active only
        </button>
        <button
          @click="selectAllStatuses"
          class="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Show all
        </button>
      </div>

      <!-- Expand/collapse controls -->
      <div class="flex items-center gap-2 ml-auto">
        <button
          @click="expandAll"
          class="text-xs text-gray-500 hover:text-gray-700"
        >
          Expand all
        </button>
        <span class="text-gray-300">|</span>
        <button
          @click="collapseAll"
          class="text-xs text-gray-500 hover:text-gray-700"
        >
          Collapse all
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredTracks.length === 0" class="text-center py-12 text-gray-500">
      <template v-if="tracks.length === 0">
        No tracks yet. Create one to get started.
      </template>
      <template v-else>
        No tracks match the current filters.
      </template>
    </div>

    <!-- Track tree -->
    <div v-else class="space-y-3">
      <template v-for="track in rootTracks" :key="track.id">
        <div>
          <!-- Track card with expand toggle -->
          <div class="flex items-start gap-2">
            <button
              v-if="hasChildren(track.id)"
              @click="toggleExpand(track.id)"
              class="mt-4 p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg
                :class="['w-4 h-4 transition-transform', isExpanded(track.id) ? 'rotate-90' : '']"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div v-else class="w-6 flex-shrink-0"></div>

            <div class="flex-1">
              <TrackCard
                :track="track"
                :all-tracks="tracks"
                :indent="0"
                @edit="emit('edit', $event)"
                @add-child="emit('addChild', $event)"
              />
            </div>
          </div>

          <!-- Children (recursive) -->
          <div v-if="hasChildren(track.id) && isExpanded(track.id)" class="ml-8 mt-2 space-y-2">
            <template v-for="child in getChildren(track.id)" :key="child.id">
              <div class="flex items-start gap-2">
                <button
                  v-if="hasChildren(child.id)"
                  @click="toggleExpand(child.id)"
                  class="mt-4 p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <svg
                    :class="['w-4 h-4 transition-transform', isExpanded(child.id) ? 'rotate-90' : '']"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div v-else class="w-6 flex-shrink-0"></div>

                <div class="flex-1">
                  <TrackCard
                    :track="child"
                    :all-tracks="tracks"
                    :indent="1"
                    @edit="emit('edit', $event)"
                    @add-child="emit('addChild', $event)"
                  />
                </div>
              </div>

              <!-- Grandchildren -->
              <div v-if="hasChildren(child.id) && isExpanded(child.id)" class="ml-8 mt-2 space-y-2">
                <div v-for="grandchild in getChildren(child.id)" :key="grandchild.id" class="flex items-start gap-2">
                  <div class="w-6 flex-shrink-0"></div>
                  <div class="flex-1">
                    <TrackCard
                      :track="grandchild"
                      :all-tracks="tracks"
                      :indent="2"
                      @edit="emit('edit', $event)"
                      @add-child="emit('addChild', $event)"
                    />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
