<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        :variant="variant"
        :class="cn(
          'w-full justify-start text-left font-normal',
          !value && 'text-muted-foreground',
          className
        )"
      >
        <CalendarIcon class="mr-2 h-4 w-4" />
        {{ value ? formatDate(value) : placeholder }}
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start">
      <Calendar
        :initial-focus="true"
        mode="single"
        :selected="value"
        @update:selected="$emit('update:modelValue', $event)"
      />
    </PopoverContent>
  </Popover>
</template>

<script setup>
import { computed } from 'vue'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from '@radix-icons/vue'

const props = defineProps({
  modelValue: {
    type: Date,
    default: null
  },
  placeholder: {
    type: String,
    default: '选择日期'
  },
  variant: {
    type: String,
    default: 'outline'
  },
  className: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const value = computed(() => props.modelValue)

const formatDate = (date) => {
  if (!date) return ''
  return format(date, 'yyyy年MM月dd日')
}
</script>