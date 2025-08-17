<script setup>
import { cn } from "/src/lib/utils";

const props = defineProps({
  class: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <p :class="cn('text-sm text-muted-foreground', props.class)">
    <slot />
  </p>
</template>
