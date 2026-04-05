<script setup>
import { computed, ref } from "vue";
import { copyText } from "vue3-clipboard";
import { alert } from "@/components/Alert/use-alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast/use-toast";
import { openLinkPanel } from "./use-link-panel";
import QRCodeDialog from "./QRCodeDialog.vue";
import StatsDialog from "./StatsDialog.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["refresh"]);
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
});
const item = ref(props.item);
const { t } = useI18n();

const fullLink = `${location.protocol}//${location.host}/${item.value.slug}`;

const getModeLabel = (mode) => {
  const key = `modes.${mode}`;
  const label = t(key);
  return label === key ? mode : label;
};

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
const statsVisible = ref(false);

const operates = computed(() => [
  {
    name: t("common.edit"),
    icon: "icon-[material-symbols--edit-document-outline]",
    operate: "edit",
  },
  {
    name: t("stats.analytics"),
    icon: "icon-[material-symbols--monitoring]",
    operate: "analytics",
  },
  {
    name: t("slugCard.actions.qrCode"),
    icon: "icon-[material-symbols--qr-code]",
    operate: "qr-code",
  },
  {
    name: t("slugCard.actions.duplicate"),
    icon: "icon-[material-symbols--file-copy-outline]",
    operate: "duplicate",
  },
  {
    name: t("common.delete"),
    icon: "icon-[material-symbols--delete-outline]",
    operate: "delete",
    class: "!text-destructive hover:!bg-destructive hover:!text-destructive-foreground",
  },
]);

const emitRefresh = () => {
  emit("refresh");
  toast({
    title: t("messages.updateSuccess"),
    description: t("messages.linkUpdated", { slug: item.value.slug }),
    class: "rounded-2xl",
  });
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
    case "analytics":
      statsVisible.value = true;
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
            toast({
              title: t("messages.deleteSuccess"),
              description: t("messages.linkDeleted", { slug: item.value.slug }),
              class: "rounded-2xl",
            });
            emit("refresh");
          } else {
            toast({
              title: t("messages.deleteFailed"),
              description: rv.msg || t("slugCard.deleteFailedDesc"),
              variant: "destructive",
              class: "rounded-2xl",
            });
          }
        })
        .catch(() => {
          toast({
            title: t("messages.deleteFailed"),
            description: t("messages.networkError"),
            variant: "destructive",
            class: "rounded-2xl",
          });
        });
      break;
    default:
      alert({ title: t("common.error"), description: t("slugCard.unknownOperate") });
      break;
  }
};
</script>
<template>
  <Card class="transition-all duration-200 rounded-2xl shadow-sm hover:shadow-md border-border">
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
              <Button variant="ghost" size="icon" @click="onClipboard"
                :class="['h-6 w-6 shrink-0 text-muted-foreground', _copied && '!text-green-600 !bg-green-50']">
                <i v-if="_copied == null" class="icon-[material-symbols--content-copy-outline-rounded] h-4 w-4" />
                <i v-else-if="_copied" class="icon-[material-symbols--check] h-4 w-4" />
                <i v-else class="icon-[material-symbols--close] h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon"
                    class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground">
                    <i class="icon-[material-symbols--more-vert] h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="rounded-2xl backdrop-blur-md bg-white/60">
                  <DropdownMenuItem v-for="op in operates" :key="op.operate"
                    :class="['flex items-center gap-2 cursor-pointer text-muted-foreground rounded-full px-3', op.class]"
                    @click="handleOperate(op.operate)">
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
            {{ getModeLabel(item.mode) }}
          </span>
          <template v-if="item.displayName">
            <span class=" bg-secondary px-2 h-5 rounded-sm text-xs font-medium flex items-center">
              {{ item.slug }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- QR码分享对话框 -->
    <QRCodeDialog v-model:visible="qrCodeVisible" :short-url="fullLink" />
    <StatsDialog v-model:visible="statsVisible" :item="item" />
  </Card>
</template>
