<template>
  <label
    :class="cn(
      'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
      className
    )"
    v-bind="$attrs"
  >
    <slot />
  </label>
</template>

<script setup>
import { cn } from '@/utils'

defineProps({
  className: {
    type: String,
    default: ''
  }
})
</script>