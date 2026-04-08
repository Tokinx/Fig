<script setup>
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useEmitAsProps,
} from "radix-vue";
import { Cross2Icon } from "@radix-icons/vue";
import { cn } from "@/lib/utils";

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  trapFocus: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: String, required: false },
});
const emits = defineEmits([
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
  "dismiss",
  "openAutoFocus",
  "closeAutoFocus",
]);

const emitsAsProps = useEmitAsProps(emits);
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <DialogContent
        :class="
          cn(
            'pointer-events-auto grid w-full max-w-lg gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
            props.class
          )
        "
        v-bind="{ ...props, ...emitsAsProps }"
      >
        <slot />
      </DialogContent>
    </div>
  </DialogPortal>
</template>
