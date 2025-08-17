<script setup>
import { ref } from "vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { state, close } from "@/components/Alert/use-alert.js";

const setAttr = (name) => {
  return state.value.data.attrs[name] || {};
};
</script>

<template>
  <AlertDialog :open="state.visible">
    <AlertDialogContent v-bind="setAttr('content')">
      <AlertDialogHeader v-bind="setAttr('header')">
        <AlertDialogTitle v-bind="setAttr('title')">
          {{ state.data.title }}
        </AlertDialogTitle>
        <AlertDialogDescription v-bind="setAttr('description')">
          {{ state.data.description }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter v-bind="setAttr('footer')">
        <AlertDialogCancel
          v-if="state.data.cancel"
          v-bind="setAttr('cancel')"
          @click="close('cancel')"
        >
          {{ state.data.cancel }}
        </AlertDialogCancel>
        <AlertDialogAction
          v-if="state.data.confirm"
          v-bind="setAttr('confirm')"
          @click="close('confirm')"
        >
          {{ state.data.confirm }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
