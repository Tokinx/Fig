<script setup>
import { ref, watch } from "vue";
import QRCode from "qrcode";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast/use-toast";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  shortUrl: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:visible"]);

const { toast } = useToast();

const qrCodeDataUrl = ref("");
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
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    };

    qrCodeDataUrl.value = await QRCode.toDataURL(props.shortUrl, options);
  } catch (error) {
    console.error("生成QR码失败:", error);
    toast({
      title: "Generation failed",
      description: "QR code generation failed, please try again.",
      variant: "destructive",
      class: "rounded-2xl",
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

  const link = document.createElement("a");
  link.download = `qrcode-${props.shortUrl.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
  link.href = qrCodeDataUrl.value;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 复制短链接
const copyShortUrl = async () => {
  try {
    await navigator.clipboard.writeText(props.shortUrl);
    toast({
      title: "Copy successful.",
      description: "Short link copied to clipboard.",
      class: "rounded-2xl",
    });
  } catch (error) {
    console.error("复制链接失败:", error);
    toast({
      title: "Copy failed",
      description: "Link copy failed, please copy manually.",
      variant: "destructive",
      class: "rounded-2xl",
    });
  }
};

// 关闭对话框
const closeDialog = () => {
  emit("update:visible", false);
};
</script>

<template>
  <Dialog :open="visible" @update:open="closeDialog">
    <DialogContent class="max-w-xl shadow-none border-0 bg-transparent">
      <div class="space-y-6 py-4">
        <!-- QR码显示区域 -->
        <div class="flex flex-col items-center space-y-4">
          <div
            v-if="loading"
            class="flex items-center justify-center"
            :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }"
          >
            <div class="flex flex-col items-center gap-2">
              <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl" />
              <span class="text-sm text-gray-500">Generating...</span>
            </div>
          </div>
          <img
            v-else-if="qrCodeDataUrl"
            :src="qrCodeDataUrl"
            :alt="shortUrl"
            class="block mx-auto transition-all"
            :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }"
          />
          <div
            v-else
            class="flex items-center justify-center bg-gray-100 rounded"
            :style="{ width: qrCodeSize + 'px', height: qrCodeSize + 'px' }"
          >
            <span class="text-gray-500">No QR code available.</span>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col gap-2">
            <!-- 短链接信息 -->
            <code class="flex-1 bg-gray-100 p-2 px-3 rounded-full text-sm max-w-80 overflow-auto">
              {{ shortUrl }}
            </code>
            <div class="flex items-center justify-center gap-2">
              <Button variant="outline" @click="copyShortUrl" size="sm" class="rounded-full">
                <i class="icon-[material-symbols--content-copy] mr-1" />
                复制
              </Button>
              <Button variant="outline" @click="downloadQRCode" size="sm" class="rounded-full">
                <i class="icon-[material-symbols--download] mr-1 text-lg" />
                下载
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
