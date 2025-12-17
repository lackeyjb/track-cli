<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { TrackWithDetails, Status } from '../api';

const props = defineProps<{
  track?: TrackWithDetails | null;
  parentId?: string | null;
  allTracks: TrackWithDetails[];
}>();

const emit = defineEmits<{
  submit: [data: {
    title?: string;
    summary: string;
    next_prompt: string;
    status: Status;
    parent_id?: string | null;
  }];
  cancel: [];
}>();

const isEditing = computed(() => !!props.track);

const title = ref('');
const summary = ref('');
const nextPrompt = ref('');
const status = ref<Status>('planned');
const parentId = ref<string | null>(null);

// Available parents (exclude self and descendants when editing)
const availableParents = computed(() => {
  if (!props.track) {
    return props.allTracks;
  }
  // When editing, exclude self and any descendants
  const excludeIds = new Set<string>([props.track.id]);
  // Simple approach: just exclude direct children for now
  props.allTracks.forEach((t) => {
    if (t.parent_id === props.track?.id) {
      excludeIds.add(t.id);
    }
  });
  return props.allTracks.filter((t) => !excludeIds.has(t.id));
});

// Reset form when props change
watch(
  () => [props.track, props.parentId],
  () => {
    if (props.track) {
      title.value = props.track.title;
      summary.value = props.track.summary;
      nextPrompt.value = props.track.next_prompt;
      status.value = props.track.status;
      parentId.value = props.track.parent_id;
    } else {
      title.value = '';
      summary.value = '';
      nextPrompt.value = '';
      status.value = 'planned';
      parentId.value = props.parentId ?? null;
    }
  },
  { immediate: true }
);

function handleSubmit() {
  const data: {
    title?: string;
    summary: string;
    next_prompt: string;
    status: Status;
    parent_id?: string | null;
  } = {
    summary: summary.value,
    next_prompt: nextPrompt.value,
    status: status.value,
  };

  if (!isEditing.value) {
    data.title = title.value;
    data.parent_id = parentId.value;
  }

  emit('submit', data);
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
      <h2 class="text-xl font-semibold mb-4">
        {{ isEditing ? 'Edit Track' : 'New Track' }}
      </h2>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Title (only for new tracks) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium text-gray-700">Title *</label>
          <input
            v-model="title"
            type="text"
            required
            placeholder="Enter track title"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
        </div>

        <!-- Parent selector (only for new tracks) -->
        <div v-if="!isEditing">
          <label class="block text-sm font-medium text-gray-700">Parent Track</label>
          <select
            v-model="parentId"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option :value="null">None (root level)</option>
            <option v-for="t in availableParents" :key="t.id" :value="t.id">
              {{ t.title }} ({{ t.id }})
            </option>
          </select>
        </div>

        <!-- Summary -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Summary</label>
          <textarea
            v-model="summary"
            rows="3"
            placeholder="Current state description"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          ></textarea>
        </div>

        <!-- Next prompt -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Next</label>
          <textarea
            v-model="nextPrompt"
            rows="2"
            placeholder="What to do next"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          ></textarea>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Status</label>
          <select
            v-model="status"
            class="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
            <option value="superseded">Superseded</option>
          </select>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          <button
            type="button"
            @click="emit('cancel')"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {{ isEditing ? 'Save Changes' : 'Create Track' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
