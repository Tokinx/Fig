<script setup>
import { cn } from "/src/lib/utils";

const props = defineProps({
  class: { type: String, required: false },
});
</script>

<template>
  <caption :class="cn('mt-4 text-sm text-muted-foreground', props.class)">
    <slot />
  </caption>
</template>
