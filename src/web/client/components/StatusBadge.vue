<script setup lang="ts">
import { computed } from 'vue';
import type { Status } from '../api';

const props = defineProps<{
  status: Status;
}>();

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  planned: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Planned' },
  in_progress: { bg: 'bg-blue-200', text: 'text-blue-800', label: 'In Progress' },
  done: { bg: 'bg-green-200', text: 'text-green-800', label: 'Done' },
  blocked: { bg: 'bg-yellow-200', text: 'text-yellow-800', label: 'Blocked' },
  superseded: { bg: 'bg-red-200', text: 'text-red-800', label: 'Superseded' },
};

const config = computed(() => statusConfig[props.status] || statusConfig.planned);
</script>

<template>
  <span :class="['text-xs px-2 py-0.5 rounded font-medium', config.bg, config.text]">
    {{ config.label }}
  </span>
</template>
