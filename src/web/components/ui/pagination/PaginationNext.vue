<script setup>
import { PaginationNext, useForwardProps } from "radix-vue";
import { ChevronRightIcon } from "@radix-icons/vue";
import { Button } from "@/components/ui/button";

const props = defineProps({
  asChild: { type: Boolean, required: false, default: true },
  as: { type: null, required: false },
});
const forwarded = useForwardProps(props);
</script>

<template>
  <PaginationNext v-bind="forwarded">
    <Button class="w-8 h-8 p-0 rounded-full shadow-none" variant="outline">
      <slot>
        <ChevronRightIcon />
      </slot>
    </Button>
  </PaginationNext>
</template>
