<template>
  <div :class="cn('p-6 pt-0', className)">
    <slot />
  </div>
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