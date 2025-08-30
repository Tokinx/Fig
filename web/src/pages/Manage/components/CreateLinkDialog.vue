<script setup>
import { computed } from "vue";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LinkForm } from "@/components/LinkForm";
import { state, close } from "./use-link-panel";
import { toast } from "@/components/ui/toast/use-toast";

// 处理表单提交成功
const handleSubmit = (result) => {
  if (result.code === 0) {
    toast({
      title: state.value.formData.creation ? "更新成功" : "创建成功",
      description: `短链接 ${state.value.formData.slug} ${state.value.formData.creation ? "已更新" : "已创建"}`,
    });
    close(true); // 传递 true 表示成功，会触发 resolve
  } else {
    toast({
      title: state.value.formData.creation ? "更新失败" : "创建失败",
      description: result.msg || "操作失败，请重试",
      variant: "destructive",
    });
  }
};

// 处理取消
const handleCancel = () => {
  close(false);
};

// 创建表单数据的计算属性，用于 v-model
const formData = computed({
  get: () => state.value.formData,
  set: (value) => {
    state.value.formData = value;
  },
});
</script>

<template>
  <Dialog :open="state.visible" @update:open="(open) => !open && close(false)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-xl font-semibold">
          {{ state.formData.creation ? "编辑短链接" : "创建短链接" }}
        </DialogTitle>
      </DialogHeader>

      <div class="pt-4">
        <LinkForm 
          v-model="formData"
          :is-dialog="true"
          :auto-slug="state.isCreate"
          @submit="handleSubmit" 
          @cancel="handleCancel"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>