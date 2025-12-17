<script setup lang="ts">
import { computed } from 'vue';
import type { TrackWithDetails, Status } from '../api';
import TrackCard from './TrackCard.vue';

const props = defineProps<{
  tracks: TrackWithDetails[];
  loading?: boolean;
  statusFilters: Set<Status>;
  expandedIds: Set<string>;
  worktreeFilter: string | null;
}>();

const emit = defineEmits<{
  edit: [track: TrackWithDetails];
  addChild: [parentId: string | null];
  'update:statusFilters': [filters: Set<Status>];
  'update:expandedIds': [ids: Set<string>];
  'update:worktreeFilter': [filter: string | null];
}>();

const allStatuses: { value: Status; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'superseded', label: 'Superseded' },
];

const uniqueWorktrees = computed(() => {
  const worktrees = new Set<string>();
  props.tracks.forEach((t) => {
    if (t.worktree) worktrees.add(t.worktree);
  });
  return Array.from(worktrees).sort();
});

function toggleStatus(status: Status) {
  const newFilters = new Set(props.statusFilters);
  if (newFilters.has(status)) {
    newFilters.delete(status);
  } else {
    newFilters.add(status);
  }
  emit('update:statusFilters', newFilters);
}

function selectAllStatuses() {
  emit('update:statusFilters', new Set(allStatuses.map((s) => s.value)));
}

function selectActiveStatuses() {
  emit('update:statusFilters', new Set(['planned', 'in_progress', 'blocked']));
}

// Filter tracks by status and worktree
const filteredTracks = computed(() => {
  let result = props.tracks;

  // Filter by status
  if (props.statusFilters.size > 0) {
    result = result.filter((t) => props.statusFilters.has(t.status));
  }

  // Filter by worktree
  if (props.worktreeFilter) {
    result = result.filter((t) => t.worktree === props.worktreeFilter);
  }

  return result;
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
  const newIds = new Set(props.expandedIds);
  if (newIds.has(trackId)) {
    newIds.delete(trackId);
  } else {
    newIds.add(trackId);
  }
  emit('update:expandedIds', newIds);
}

function isExpanded(trackId: string): boolean {
  return props.expandedIds.has(trackId);
}

// Expand all
function expandAll() {
  const ids = new Set<string>();
  props.tracks.forEach((t) => {
    if (hasChildren(t.id)) {
      ids.add(t.id);
    }
  });
  emit('update:expandedIds', ids);
}

// Collapse all
function collapseAll() {
  emit('update:expandedIds', new Set());
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

      <!-- Worktree filter -->
      <div v-if="uniqueWorktrees.length > 0" class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Worktree:</span>
        <select
          :value="worktreeFilter ?? ''"
          @change="emit('update:worktreeFilter', ($event.target as HTMLSelectElement).value || null)"
          class="text-xs px-2 py-1 rounded border border-gray-200 bg-gray-50"
        >
          <option value="">All</option>
          <option v-for="wt in uniqueWorktrees" :key="wt" :value="wt">
            @{{ wt }}
          </option>
        </select>
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
