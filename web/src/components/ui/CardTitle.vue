<template>
  <h3 :class="cn('text-2xl font-semibold leading-none tracking-tight', className)">
    <slot />
  </h3>
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