<script setup>
import { alertVariants } from ".";
import { cn } from "/src/lib/utils";

const props = defineProps({
  variant: { type: null, required: false },
  class: { type: String, required: false },
});
</script>

<template>
  <div :class="cn(alertVariants({ variant }), props.class ?? '')">
    <slot />
  </div>
</template>
