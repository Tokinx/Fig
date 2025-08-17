<script setup>
import { cn } from "/src/lib/utils";

const props = defineProps({
  class: { type: String, required: false },
});
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-secondary', props.class)" />
</template>
