<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { modeList } from "@/lib/link-config";
import { state, close } from "./use-link-panel";
import { toast } from "@/components/ui/toast/use-toast";

const originalUrl = location.host;
const internalLoading = ref({ randomize: false, create: false });

// 高级设置展开状态
const advanced = ref(false);

// 创建表单数据的计算属性，用于 v-model
const formData = computed({
  get: () => state.value.formData,
  set: (value) => {
    state.value.formData = value;
  },
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
      formData.value = { ...formData.value, slug: data };
    }, 500);
  } catch (error) {
    console.error("Failed to generate slug:", error);
    toast({
      title: "生成失败",
      description: "无法生成短链接标识符，请手动输入",
      variant: "destructive",
      class: "rounded-2xl",
    });
  } finally {
    setTimeout(() => {
      internalLoading.value.randomize = false;
    }, 500);
  }
};

// 切换跳转模式
const switchMode = (mode) => {
  formData.value = { ...formData.value, mode };
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
        class: "rounded-2xl",
      });
      close(true); // 传递 true 表示成功，会触发 resolve
    } else {
      toast({
        title: formData.value.creation ? "更新失败" : "创建失败",
        description: result.msg || "操作失败，请重试",
        variant: "destructive",
        class: "rounded-2xl",
      });
    }
  } catch (error) {
    toast({
      title: "操作失败",
      description: "网络错误，请检查连接后重试",
      variant: "destructive",
      class: "rounded-2xl",
    });
    console.error("Network error:", error);
  } finally {
    internalLoading.value.create = false;
  }
};


let advancedHeight = ref("");
let advancedArea = ref(null);
const switchAdvanced = () => {
  // 计算内容高度
  if (!advancedArea.value) return;
  const contentHeight = advancedArea.value.scrollHeight;
  advancedHeight.value = contentHeight + 10;
  advanced.value = !advanced.value;
};

// 监听表单数据变化，如果是新创建且没有 slug，自动生成
watch(
  () => formData.value,
  (newValue) => {
    if (state.value.isCreate && !newValue.creation && !newValue.slug) {
      nextTick(() => {
        handleRandomize();
      });
    }
  },
  { immediate: true }
);
</script>

<template>
  <Dialog :open="state.visible" @update:open="(open) => !open && close(false)">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto shadow-none p-2 border-0 bg-transparent">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- 基础信息 -->
        <div class="space-y-6">
          <!-- 目标链接 -->
          <div class="relative">
            <Textarea
              id="url"
              :model-value="formData.url"
              @update:model-value="(value) => formData = { ...formData, url: value }"
              placeholder="https://example.com"
              class="resize-none rounded-2xl pb-10"
              :rows="4"
              :disabled="internalLoading.create"
            />
            <div class="absolute bottom-2 left-2 right-2 flex">
              <div class="flex gap-1 bg-white/60 backdrop-blur rounded-full overflow-auto">
                <Button
                  v-for="option in modeList"
                  :key="option.value"
                  :value="option.value"
                  @click.prevent="switchMode(option.value)"
                  :variant="formData.mode === option.value ? 'default' : 'outline'"
                  class="rounded-full text-xs h-7 border-0 shadow-none shrink-0"
                >
                  {{ option.label }}
                </Button>
              </div>
              <div class="flex-1 mx-2"></div>
              <Button
                type="submit"
                :disabled="!isFormValid || internalLoading.create"
                class="rounded-full h-7 self-end gap-2 shrink-0"
              >
                <i v-if="internalLoading.create" class="icon-[material-symbols--refresh] animate-spin" />
                <i v-else class="icon-[material-symbols--flash-on] text-sm" />
                {{ formData.creation ? "更新" : "创建" }}
              </Button>
            </div>
          </div>

          <div class="flex">
            <!-- 短链接 -->
            <div class="flex w-full max-w-80 relative rounded-full border border-input shadow-sm bg-slate-100">
              <div class="flex items-center h-9 px-3 pr-2 text-sm" :class="formData.creation && 'text-slate-500'">
                {{ originalUrl }}
              </div>
              <Input
                type="text"
                :class="['rounded-full shadow-none border-0 !bg-white !pl-2 pr-10', formData.creation && '!opacity-100 text-slate-500']"
                :model-value="formData.slug"
                @update:model-value="(value) => formData = { ...formData, slug: value }"
                placeholder="短链接"
                :disabled="formData.creation"
                required
                pattern="[a-zA-Z0-9_\-.]{1,24}"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                class="rounded-full absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 flex-shrink-0 active:scale-95"
                :disabled="formData.creation"
                @click.prevent="handleRandomize"
              >
                <i v-if="!internalLoading.randomize" class="icon-[material-symbols--autorenew-outline-rounded] text-base" />
                <i v-else class="icon-[material-symbols--progress-activity] animate-spin text-base" />
              </Button>
            </div>

            <div class="flex-1"></div>

            <!-- 高级设置 -->
            <Button variant="text" type="button" class="shrink-0 self-end text-xs rounded-full" @click="switchAdvanced">
              高级设置
              <i
                :class="[
                  'icon-[material-symbols--expand-more] transition-transform text-lg -mr-1',
                  advanced && 'rotate-180',
                ]"
              />
            </Button>
          </div>

          <div
            ref="advancedArea"
            :class="['space-y-4 overflow-hidden transition-all px-2 -mx-2', advanced && 'py-1']"
            :style="{ height: advanced ? advancedHeight + 'px' : '0' }"
          >
            <div class="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <!-- 名称 -->
              <div class="space-y-2">
                <Input
                  id="displayName"
                  class="rounded-full"
                  :model-value="formData.displayName"
                  @update:model-value="(value) => formData = { ...formData, displayName: value }"
                  placeholder="显示名称"
                  :disabled="internalLoading.create"
                />
              </div>
              <!-- 密码 -->
              <div class="space-y-2">
                <Input
                  id="passcode"
                  class="rounded-full"
                  :model-value="formData.passcode"
                  @update:model-value="(value) => formData = { ...formData, passcode: value }"
                  placeholder="访问密码"
                  type="password"
                  :disabled="internalLoading.create"
                />
              </div>
            </div>
            <!-- 备注 -->
            <div class="space-y-2">
              <Textarea
                id="notes"
                :model-value="formData.notes"
                @update:model-value="(value) => formData = { ...formData, notes: value }"
                placeholder="为这个短链接添加一些备注信息..."
                class="rounded-2xl resize-none"
                rows="4"
                :disabled="internalLoading.create"
              />
            </div>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
