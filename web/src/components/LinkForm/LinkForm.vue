<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { modeList, BaseData, DeepClone } from "@/lib/link-config";
import { toast } from "@/components/ui/toast/use-toast";

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => DeepClone(BaseData),
  },
  isDialog: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  autoSlug: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const originalUrl = location.host;
const internalLoading = ref({ randomize: false, create: false });

// 响应式的表单数据
const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// 表单验证
const isFormValid = computed(() => {
  return formData.value.url && formData.value.url.trim();
});

// 生成随机slug
const handleRandomize = async () => {
  internalLoading.value.randomize = true;
  try {
    const response = await fetch(`/api/?action=randomize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const { data } = await response.json();
    
    setTimeout(() => {
      const newFormData = { ...formData.value, slug: data };
      emit('update:modelValue', newFormData);
    }, 500);
  } catch (error) {
    console.error("Failed to generate slug:", error);
    toast({
      title: "生成失败",
      description: "无法生成短链接标识符，请手动输入",
      variant: "destructive",
    });
  } finally {
    setTimeout(() => {
      internalLoading.value.randomize = false;
    }, 500);
  }
};

// 切换跳转模式
const switchMode = (mode) => {
  const newFormData = { ...formData.value, mode };
  emit('update:modelValue', newFormData);
};

// 提交表单
const handleSubmit = async () => {
  if (!isFormValid.value) return;
  
  internalLoading.value.create = true;
  try {
    const response = await fetch(`/api/?action=save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData.value),
    });
    const result = await response.json();
    
    if (result.code === 0) {
      toast({
        title: formData.value.creation ? "更新成功" : "创建成功",
        description: `短链接 ${formData.value.slug} ${formData.value.creation ? "已更新" : "已创建"}`,
      });
      emit('submit', result);
    } else {
      toast({
        title: formData.value.creation ? "更新失败" : "创建失败",
        description: result.msg || "操作失败，请重试",
        variant: "destructive",
      });
    }
  } catch (error) {
    toast({
      title: "操作失败",
      description: "网络错误，请检查连接后重试",
      variant: "destructive",
    });
    console.error("Network error:", error);
  } finally {
    internalLoading.value.create = false;
  }
};

// 取消操作
const handleCancel = () => {
  emit('cancel');
};

// 监听 modelValue 变化，如果是新创建且没有 slug，自动生成
watch(
  () => props.modelValue,
  (newValue) => {
    if (props.autoSlug && !newValue.creation && !newValue.slug) {
      nextTick(() => {
        handleRandomize();
      });
    }
  },
  { immediate: true }
);
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- 基础信息 -->
    <div class="space-y-4">
      <!-- 目标链接 -->
      <div class="space-y-2">
        <Label for="url" class="text-sm font-medium">目标链接 *</Label>
        <Textarea
          id="url"
          :model-value="formData.url"
          @update:model-value="(value) => emit('update:modelValue', { ...formData, url: value })"
          placeholder="https://example.com"
          class="resize-none"
          rows="2"
          :disabled="loading || internalLoading.create"
        />
      </div>

      <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <!-- 短链接 -->
        <div class="space-y-2">
          <Label>短链接</Label>
          <div class="flex mt-2 gap-2">
            <div class="flex w-full relative">
              <div
                class="flex items-center h-9 px-3 rounded-md border border-input rounded-r-none text-sm shadow-sm bg-slate-100"
              >
                {{ originalUrl }}/
              </div>
              <Input
                type="text"
                :class="['rounded-l-none ml-[-1px]', formData.creation && 'bg-slate-100']"
                :model-value="formData.slug"
                @update:model-value="(value) => emit('update:modelValue', { ...formData, slug: value })"
                placeholder="短链接"
                :disabled="formData.creation"
                required
                pattern="[a-zA-Z0-9_\-.]{6,24}"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                :class="[
                  'absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 flex-shrink-0 active:scale-95',
                  formData.creation && 'bg-slate-100',
                ]"
                :disabled="formData.creation"
                @click.prevent="handleRandomize"
              >
                <i v-if="!internalLoading.randomize" class="icon-[material-symbols--autorenew-outline-rounded] text-base" />
                <i v-else class="icon-[material-symbols--progress-activity] animate-spin text-base" />
              </Button>
            </div>
          </div>
        </div>

        <!-- 显示名称 -->
        <div class="space-y-2">
          <Label for="displayName" class="text-sm font-medium">显示名称</Label>
          <Input
            id="displayName"
            :model-value="formData.displayName"
            @update:model-value="(value) => emit('update:modelValue', { ...formData, displayName: value })"
            placeholder="为您的短链接添加一个便于识别的名称"
            :disabled="loading || internalLoading.create"
          />
        </div>
      </div>

      <!-- 跳转模式 -->
      <div class="space-y-2">
        <Label for="mode" class="text-sm font-medium">跳转模式</Label>
        <div class="flex gap-2">
          <Tabs :model-value="formData.mode" class="w-full">
            <TabsList class="grid w-full grid-cols-4">
              <TabsTrigger
                v-for="option in modeList"
                :key="option.value"
                :value="option.value"
                @click="switchMode(option.value)"
              >
                {{ option.label }}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <!-- 备注 -->
      <div class="space-y-2">
        <Label for="notes" class="text-sm font-medium">备注</Label>
        <Textarea
          id="notes"
          :model-value="formData.notes"
          @update:model-value="(value) => emit('update:modelValue', { ...formData, notes: value })"
          placeholder="为这个短链接添加一些备注信息..."
          class="flex-1"
          rows="8"
          :disabled="loading || internalLoading.create"
        />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="!isDialog" class="flex items-center justify-end gap-3 pt-4">
      <Button type="button" variant="outline" @click="handleCancel" :disabled="loading || internalLoading.create">
        取消
      </Button>
      <Button type="submit" :disabled="!isFormValid || loading || internalLoading.create" class="min-w-[100px]">
        <i v-if="loading || internalLoading.create" class="icon-[material-symbols--refresh] animate-spin mr-2" />
        {{ formData.creation ? "更新" : "创建" }}
      </Button>
    </div>

    <!-- 弹窗模式下的操作按钮由父组件处理 -->
    <div v-else class="flex items-center justify-end gap-3 pt-4">
      <Button type="button" variant="outline" @click="handleCancel" :disabled="loading || internalLoading.create">
        取消
      </Button>
      <Button type="submit" :disabled="!isFormValid || loading || internalLoading.create" class="min-w-[100px]">
        <i v-if="loading || internalLoading.create" class="icon-[material-symbols--refresh] animate-spin mr-2" />
        {{ formData.creation ? "更新" : "创建" }}
      </Button>
    </div>
  </form>
</template>