<script setup>
import { AlertDialogAction } from "radix-vue";
import { cn } from "/src/lib/utils";
import { buttonVariants } from "/src/components/ui/button";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
});
</script>

<template>
  <AlertDialogAction
    v-bind="props"
    :class="cn(buttonVariants(), $attrs.class ?? '')"
  >
    <slot />
  </AlertDialogAction>
</template>
