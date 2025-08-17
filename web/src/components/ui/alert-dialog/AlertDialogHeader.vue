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
  <div
    :class="cn('flex flex-col space-y-2 text-center sm:text-left', props.class)"
  >
    <slot />
  </div>
</template>
