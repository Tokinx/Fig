<script setup>
import { PaginationFirst, useForwardProps } from "radix-vue";
import { DoubleArrowLeftIcon } from "@radix-icons/vue";
import { Button } from "@/components/ui/button";

const props = defineProps({
  asChild: { type: Boolean, required: false, default: true },
  as: { type: null, required: false },
});
const forwarded = useForwardProps(props);
</script>

<template>
  <PaginationFirst v-bind="forwarded">
    <Button class="w-8 h-8 p-0 rounded-full shadow-none" variant="outline">
      <slot>
        <DoubleArrowLeftIcon />
      </slot>
    </Button>
  </PaginationFirst>
</template>
