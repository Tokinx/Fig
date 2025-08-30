<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LinkForm } from "@/components/LinkForm";
import { BaseData, DeepClone } from "@/lib/link-config";
import { toast } from "@/components/ui/toast/use-toast";

const router = useRouter();
const host = location.host;

// 表单数据
const formData = ref(DeepClone(BaseData));

// 创建状态管理
const createState = reactive({
  loading: false,
  success: false,
  lastCreatedSlug: '',
  showSuccessActions: false,
});

// 处理创建成功
const handleCreate = (result) => {
  createState.success = true;
  createState.lastCreatedSlug = formData.value.slug;
  createState.showSuccessActions = true;
  
  // 显示成功提示
  toast({
    title: "创建成功",
    description: `短链接 ${formData.value.slug} 已创建`,
  });
};

// 处理取消
const handleCancel = () => {
  // 重置表单
  formData.value = DeepClone(BaseData);
  createState.success = false;
  createState.showSuccessActions = false;
};

// 继续创建新的短链接
const handleCreateAnother = () => {
  formData.value = DeepClone(BaseData);
  createState.success = false;
  createState.showSuccessActions = false;
};

// 前往管理页面
const goToManage = () => {
  router.push('/manage');
};

// 复制链接
const copyLink = async () => {
  const fullLink = `${location.protocol}//${location.host}/${createState.lastCreatedSlug}`;
  try {
    await navigator.clipboard.writeText(fullLink);
    toast({
      title: "复制成功",
      description: "短链接已复制到剪贴板",
    });
  } catch (error) {
    console.error('Failed to copy:', error);
    toast({
      title: "复制失败",
      description: "请手动复制链接",
      variant: "destructive",
    });
  }
};
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- 头部导航 -->
    <div class="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="container px-4">
        <div class="flex h-16 items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold tracking-tight">{{ host }}</h1>
            <span class="text-muted-foreground">/ 创建短链接</span>
          </div>
          <Button variant="outline" @click="goToManage" class="gap-2">
            <i class="icon-[material-symbols--list] h-4 w-4" />
            查看管理
          </Button>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <main class="container max-w-2xl mx-auto px-4 py-8">
      <div class="space-y-6">
        <!-- 页面标题 -->
        <div class="text-center space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">创建短链接</h1>
          <p class="text-muted-foreground">
            快速生成您的专属短链接，支持多种跳转模式和自定义配置
          </p>
        </div>

        <!-- 成功状态显示 -->
        <div v-if="createState.showSuccessActions" class="space-y-4">
          <Alert class="border-green-200 bg-green-50 text-green-800">
            <i class="icon-[material-symbols--check-circle] h-4 w-4" />
            <AlertDescription>
              短链接创建成功！您的短链接是：
              <div class="mt-2 p-2 bg-white rounded border font-mono text-sm break-all">
                {{ location.protocol }}//{{ location.host }}/{{ createState.lastCreatedSlug }}
              </div>
            </AlertDescription>
          </Alert>

          <!-- 成功后的操作选项 -->
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">接下来您可以：</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button @click="copyLink" variant="outline" class="gap-2">
                  <i class="icon-[material-symbols--content-copy] h-4 w-4" />
                  复制链接
                </Button>
                <Button @click="handleCreateAnother" class="gap-2">
                  <i class="icon-[material-symbols--add] h-4 w-4" />
                  继续创建
                </Button>
                <Button @click="goToManage" variant="outline" class="gap-2">
                  <i class="icon-[material-symbols--list] h-4 w-4" />
                  查看管理
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <!-- 创建表单 -->
        <Card v-if="!createState.showSuccessActions">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>
              填写目标链接和相关设置，我们将为您生成短链接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LinkForm 
              v-model="formData" 
              :loading="createState.loading"
              @submit="handleCreate" 
              @cancel="handleCancel"
            />
          </CardContent>
        </Card>

        <!-- 功能说明 -->
        <div v-if="!createState.showSuccessActions" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <i class="icon-[material-symbols--speed] h-5 w-5 text-blue-500" />
                快速便捷
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">
                自动生成短链接标识符，也支持自定义设置，满足不同使用需求
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <i class="icon-[material-symbols--settings] h-5 w-5 text-green-500" />
                多种模式
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted-foreground">
                支持跳转、提醒、隐藏、代理四种模式，适应不同的使用场景
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="border-t border-border mt-16">
      <div class="container px-4 py-6">
        <div class="flex items-center justify-center text-sm text-muted-foreground">
          <span>{{ host }} 短链接服务</span>
        </div>
      </div>
    </footer>
  </div>
</template>