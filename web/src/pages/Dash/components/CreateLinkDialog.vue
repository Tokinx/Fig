<script setup>
import { nextTick, ref, watch } from "vue";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { state, close, modeList } from "./use-link-panel";
import { toast } from "@/components/ui/toast/use-toast";

const originalUrl = location.host;

const loading = ref({ randomize: false, create: false });

const handleRandomize = async () => {
  loading.value.randomize = true;
  fetch(`/api/?action=randomize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then((res) => res.json())
    .then(({ data }) => {
      setTimeout(() => {
        state.value.formData.slug = data;
      }, 500);
    })
    .finally(() => {
      setTimeout(() => {
        loading.value.randomize = false;
      }, 500);
    });
};

const switchMode = (mode) => {
  state.value.formData.mode = mode;
};

// 监听弹窗打开状态，自动生成短网址
watch(() => state.value.visible, (visible) => {
  if (visible && state.value.isCreate && !state.value.formData.slug) {
    // 延迟一下确保弹窗完全打开
    nextTick(() => {
      handleRandomize();
    });
  }
});

const handleSubmit = async () => {
  loading.value.create = true;
  fetch(`/api/?action=save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.value.formData),
  })
    .then((res) => res.json())
    .then((rv) => {
      console.log(rv);
      if (rv.code === 0) {
        // 显示成功提示
        toast({
          title: state.value.formData.creation ? "更新成功" : "创建成功",
          description: `短链接 ${state.value.formData.slug} ${state.value.formData.creation ? '已更新' : '已创建'}`,
        });
        close(true); // 传递 true 表示成功，会触发 resolve
      } else {
        // 显示错误提示
        toast({
          title: state.value.formData.creation ? "更新失败" : "创建失败",
          description: rv.msg || "操作失败，请重试",
          variant: "destructive",
        });
        console.error('Error creating link:', rv.msg);
      }
    })
    .catch((error) => {
      // 网络错误或其他异常
      toast({
        title: "操作失败",
        description: "网络错误，请检查连接后重试",
        variant: "destructive",
      });
      console.error('Network error:', error);
    })
    .finally(() => {
      loading.value.create = false;
    });
};

const isFormValid = () => {
  return state.value.formData.url && state.value.formData.url.trim();
};
</script>

<template>
  <Dialog :open="state.visible" @update:open="(open) => !open && close(false)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="text-xl font-semibold">
          {{ state.formData.creation ? '编辑短链接' : '创建短链接' }}
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-6">
        <!-- 基础信息 -->
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="url" class="text-sm font-medium">目标链接 *</Label>
            <Textarea id="url" v-model="state.formData.url" placeholder="https://example.com"
              class="min-h-[80px] resize-none" :disabled="loading.create" />
          </div>

          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>短链接</Label>
              <div class="flex mt-2 gap-2">
                <div class="flex w-full relative">
                  <Input type="text" placeholder="https://example.com" class="w-[120px] rounded-r-none bg-slate-100"
                    v-model="originalUrl" readonly />
                  <Input type="text" :class="[
                    'rounded-l-none ml-[-1px]',
                    !state.isCreate && 'bg-slate-100',
                  ]" v-model="state.formData.slug" placeholder="短链接" :disabled="!state.isCreate" required
                    pattern="[a-zA-Z0-9_\-.]{6,24}" />
                  <Button type="button" variant="outline" size="icon" :class="[
                    'absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 flex-shrink-0 active:scale-95',
                    !state.isCreate && 'bg-slate-100',
                  ]" :disabled="!state.isCreate" @click.prevent="handleRandomize">
                    <i v-if="!loading.randomize" class="icon-[material-symbols--autorenew-outline-rounded] text-base" />
                    <i v-else class="icon-[material-symbols--progress-activity] animate-spin text-base" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <Label for="displayName" class="text-sm font-medium">显示名称</Label>
              <Input id="displayName" v-model="state.formData.displayName" placeholder="为您的短链接添加一个便于识别的名称"
                :disabled="loading.create" />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="mode" class="text-sm font-medium">跳转模式</Label>
            <div class="flex gap-2">
              <Tabs :default-value="state.formData.mode" class="w-full">
                <TabsList class="grid w-full grid-cols-4">
                  <TabsTrigger v-for="option in modeList" :key="option.value" :value="option.value"
                    @click="switchMode(option.value)">
                    {{ option.label }}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <!-- 高级设置 -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1 flex flex-col height-full">
              <Label for="notes" class="text-sm font-medium">备注</Label>
              <Textarea id="notes" v-model="state.formData.notes" placeholder="为这个短链接添加一些备注信息..."
                class="resize-none flex-1" :disabled="loading.create" />
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" @click="close(false)" :disabled="loading.create">
            取消
          </Button>
          <Button @click="handleSubmit" :disabled="!isFormValid() || loading.create" class="min-w-[100px]">
            <i v-if="loading.create" class="icon-[material-symbols--refresh] animate-spin mr-2" />
            {{ state.formData.creation ? '更新' : '创建' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>