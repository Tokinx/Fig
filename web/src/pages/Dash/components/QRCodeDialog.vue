<script setup>
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast/use-toast";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  shortUrl: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:visible']);

const { toast } = useToast();

const qrCodeDataUrl = ref('');
const qrCodeSize = ref(256);
const loading = ref(false);

// 生成QR码
const generateQRCode = async () => {
  if (!props.shortUrl) return;

  loading.value = true;
  try {
    const options = {
      width: qrCodeSize.value,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    };

    qrCodeDataUrl.value = await QRCode.toDataURL(props.shortUrl, options);
  } catch (error) {
    console.error('生成QR码失败:', error);
    toast({
      title: "生成失败",
      description: "QR码生成失败，请重试",
      variant: "destructive",
    });
  } finally {
    loading.value = false;
  }
};

// 监听短链接变化，自动生成QR码
watch(() => props.shortUrl, generateQRCode, { immediate: true });
watch(() => qrCodeSize.value, generateQRCode);

// 下载QR码
const downloadQRCode = () => {
  if (!qrCodeDataUrl.value) return;

  const link = document.createElement('a');
  link.download = `qrcode-${props.shortUrl.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  link.href = qrCodeDataUrl.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  toast({
    title: "下载成功",
    description: "QR码已保存到本地",
  });
};

// 复制短链接
const copyShortUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.shortUrl);
    toast({
      title: "复制成功",
      description: "短链接已复制到剪贴板",
    });
  } catch (error) {
    console.error('复制链接失败:', error);
    toast({
      title: "复制失败",
      description: "链接复制失败，请手动复制",
      variant: "destructive",
    });
  }
};

// 关闭对话框
const closeDialog = () => {
  emit('update:visible', false);
};
</script>

<template>
  <Dialog :open="visible" @update:open="closeDialog">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <i class="icon-[material-symbols--qr-code-rounded] text-xl" />
          QR码分享
        </DialogTitle>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- 短链接信息 -->
        <div class="space-y-2">
          <Label>短链接</Label>
          <div class="flex gap-2">
            <code class="flex-1 bg-gray-100 p-2 rounded text-sm">{{ shortUrl }}</code>
            <Button variant="outline" @click="copyShortUrl" class="shrink-0">
              <i class="icon-[material-symbols--content-copy] mr-1" />
              复制
            </Button>
          </div>
        </div>

        <!-- <Separator /> -->

        <!-- QR码显示区域 -->
        <div class="flex flex-col items-center space-y-4">
          <Card class="p-4 flex justify-center">
            <CardContent class="p-0">
              <div v-if="loading" class="flex items-center justify-center"
                :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }">
                <div class="flex flex-col items-center gap-2">
                  <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl" />
                  <span class="text-sm text-gray-500">生成中...</span>
                </div>
              </div>
              <img v-else-if="qrCodeDataUrl" :src="qrCodeDataUrl" :alt="`QR码: ${shortUrl}`" class="block mx-auto"
                :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }" />
              <div v-else class="flex items-center justify-center bg-gray-100 rounded"
                :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }">
                <span class="text-gray-500">暂无QR码</span>
              </div>
            </CardContent>
          </Card>

          <!-- 操作按钮 -->
          <div class="flex gap-2">
            <Button variant="outline" size="sm" @click="downloadQRCode" :disabled="!qrCodeDataUrl">
              <i class="icon-[material-symbols--download] mr-1 text-lg" />
              下载
            </Button>
            <Button variant="outline" size="sm" :class="[qrCodeSize === 128 && 'bg-primary text-primary-foreground']"
              @click="qrCodeSize = 128">
              小
            </Button>
            <Button variant="outline" size="sm" :class="[qrCodeSize === 256 && 'bg-primary text-primary-foreground']"
              @click="qrCodeSize = 256">
              中
            </Button>
            <Button variant="outline" size="sm" :class="[qrCodeSize === 512 && 'bg-primary text-primary-foreground']"
              @click="qrCodeSize = 512">
              大
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>