<script setup>
import { ref } from "vue";
import { format } from "date-fns";
import { copyText } from "vue3-clipboard";
import { alert } from "@/components/Alert/use-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast/use-toast";
import { openLinkPanel } from "./use-link-panel";
import QRCodeDialog from "./QRCodeDialog.vue";

const emit = defineEmits(["refresh"]);
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});
const item = ref(props.item);

const fullLink = `${location.protocol}//${location.host}/${item.value.slug}`;

const _copied = ref(null);
const onClipboard = async () => {
  copyText(fullLink, undefined, (error, event) => {
    _copied.value = !error;
  });
  setTimeout(() => {
    _copied.value = null;
  }, 1000);
};

// QR码对话框状态
const qrCodeVisible = ref(false);
// 统计对话框状态已移除

const operates = [
  {
    name: "Edit",
    icon: "icon-[material-symbols--edit-document-outline]",
    operate: "edit",
  },
  {
    name: "QR Code",
    icon: "icon-[material-symbols--qr-code]",
    operate: "qr-code",
  },
  {
    name: "Duplicate",
    icon: "icon-[material-symbols--file-copy-outline]",
    operate: "duplicate",
  },
  {
    name: "Delete",
    icon: "icon-[material-symbols--delete-outline]",
    operate: "delete",
    class: "!text-destructive hover:!bg-destructive hover:!text-destructive-foreground",
  },
];

const emitRefresh = () => {
  emit("refresh");
  toast({ title: "操作成功", description: `短链接 ${item.value.slug} 已更新`, class: "rounded-2xl" });
};

const handleOperate = async (operate) => {
  switch (operate) {
    case "edit":
      openLinkPanel({ ...item.value, value: undefined, key: undefined })
        .then(emitRefresh)
        .catch(() => {
          // do nothing
        });
      break;
    case "duplicate":
      openLinkPanel({
        ...item.value,
        value: undefined,
        key: undefined,
        creation: undefined,
        slug: `${item.value.slug}-copy`,
      })
        .then(emitRefresh)
        .catch(() => {
          // do nothing
        });
      break;
    case "qr-code":
      qrCodeVisible.value = true;
      break;
    case "delete":
      fetch(`/api/?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.value.slug }),
      })
        .then((res) => res.json())
        .then((rv) => {
          console.log(rv);
          if (rv.code === 0) {
            toast({ title: "删除成功", description: `短链接 ${item.value.slug} 已删除`, class: "rounded-2xl" });
            emit("refresh");
          } else {
            toast({
              title: "删除失败",
              description: rv.msg || "删除操作失败，请重试",
              variant: "destructive",
              class: "rounded-2xl",
            });
          }
        })
        .catch(() => {
          toast({ title: "删除失败", description: "网络错误，请重试", variant: "destructive", class: "rounded-2xl" });
        });
      break;
    default:
      alert({ title: "Error", description: "Unknown operate" });
      break;
  }
};
</script>
<template>
  <Card class="transition-all duration-200 rounded-xl shadow-sm hover:shadow-md border-border">
    <div class="p-5">
      <div class="flex flex-col space-y-2">
        <div class="flex flex-col space-y-1 min-w-0 flex-1">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold truncate text-blue-500 hover:underline">
              <a :href="fullLink" target="_blank">
                {{ item.displayName || item.slug }}
              </a>
            </h3>

            <div class="flex items-center space-x-1 ml-3">
              <Button
                variant="ghost"
                size="icon"
                @click="onClipboard"
                :class="['h-6 w-6 shrink-0 text-muted-foreground', _copied && '!text-green-600 !bg-green-50']"
              >
                <i v-if="_copied == null" class="icon-[material-symbols--content-copy-outline-rounded] h-4 w-4" />
                <i v-else-if="_copied" class="icon-[material-symbols--check] h-4 w-4" />
                <i v-else class="icon-[material-symbols--close] h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <i class="icon-[material-symbols--more-vert] h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="shadow-sm">
                  <DropdownMenuItem
                    v-for="op in operates"
                    :key="op.operate"
                    :class="['flex items-center gap-2 cursor-pointer text-muted-foreground', op.class]"
                    @click="handleOperate(op.operate)"
                  >
                    <i :class="op.icon + ' h-4 w-4'" />
                    <span>{{ op.name }}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <p class="text-xs text-muted-foreground truncate" @click="handleOperate('edit')">
            {{ item.url }}
          </p>
        </div>

        <div class="flex items-center text-xs text-muted-foreground space-x-1">
          <span class="capitalize bg-secondary px-2 h-5 rounded-sm text-xs font-medium flex items-center">
            {{ item.mode }}
          </span>
          <template v-if="item.displayName">
            <span class="capitalize bg-secondary px-2 h-5 rounded-sm text-xs font-medium flex items-center">
              {{ item.slug }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- QR码分享对话框 -->
    <QRCodeDialog v-model:visible="qrCodeVisible" :short-url="fullLink" />
  </Card>
</template>
