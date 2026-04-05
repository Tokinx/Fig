<template>
  <div>
    <!-- bg-slate-50 -->
    <TooltipProvider>
      <RouterView />
      <Toaster />
      <Alerter />
    </TooltipProvider>
  </div>
</template>

<script setup>
import Toaster from "@/components/ui/toast/Toaster.vue";
import Alerter from "@/components/Alert/Alerter.vue";
import { TooltipProvider } from "@/components/ui/tooltip";
</script>
