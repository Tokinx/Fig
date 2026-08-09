<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { format } from "date-fns";
import { copyText } from "vue3-clipboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationList,
  PaginationListItem,
  PaginationEllipsis,
  PaginationFirst,
  PaginationPrev,
  PaginationNext,
  PaginationLast,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateLinkDialog from "./CreateLinkDialog.vue";
import QRCodeDialog from "./QRCodeDialog.vue";
import StatsDialog from "./StatsDialog.vue";
import { openLinkPanel } from "./use-link-panel";
import { getModeList } from "@/lib/link-config";
import { toast } from "@/components/ui/toast/use-toast";
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const loading = ref(false);
const tableData = ref([]);
const pagination = ref({ count: 0, page: 1, rows: 20 });
const currentSearch = ref('');
const currentFilter = ref('all');
let activeRequestId = 0;

// 弹窗状态(表格行共用)
const qrItem = ref(null);
const qrVisible = ref(false);
const statsItem = ref(null);
const statsVisible = ref(false);
const copiedSlug = ref(null);

const buildRequestBody = (page, searchQuery = currentSearch.value, filterMode = currentFilter.value) => {
  const requestBody = {
    rows: pagination.value.rows,
    page,
  };

  if (searchQuery) {
    requestBody.search = searchQuery;
  }

  if (filterMode && filterMode !== 'all') {
    requestBody.mode = filterMode;
  }

  return requestBody;
};

const mapResults = (results = [], oidPrefix = Math.random().toString(36).substring(2)) => {
  return results.map((x) => {
    let value = {};
    try {
      value = JSON.parse(x.value);
    } catch (e) {
      console.log(e);
    }

    return { ...x, ...value, oid: oidPrefix + x.key, createdAt: x.creation };
  });
};

const fetchPage = async (page, searchQuery = currentSearch.value, filterMode = currentFilter.value) => {
  const response = await fetch(`/api/?action=get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildRequestBody(page, searchQuery, filterMode)),
  });

  const result = await response.json();
  if (!response.ok || result.code !== 0) {
    throw new Error(result.msg || "Failed to fetch links");
  }

  const { count = 0, results = [] } = result.data || {};
  return {
    count,
    items: mapResults(results),
  };
};

const applyPageData = ({ count, items }) => {
  pagination.value.count = count;
  tableData.value = items;
};

const loadPage = async (page, searchQuery = currentSearch.value, filterMode = currentFilter.value) => {
  const requestId = ++activeRequestId;
  loading.value = true;

  try {
    const data = await fetchPage(page, searchQuery, filterMode);
    if (requestId !== activeRequestId) {
      return;
    }
    applyPageData(data);
  } catch (error) {
    if (requestId === activeRequestId) {
      console.error("Failed to fetch links:", error);
    }
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
    }
  }
};

// 页码变化时加载对应页(v-model 同步后触发，避免与点击事件重复)
watch(() => pagination.value.page, (page) => {
  loadPage(page);
});

// 数据删除后当前页可能超出范围，自动回退到最后一页(watch 会触发重新加载)
const clampPage = (count) => {
  const lastPage = Math.max(1, Math.ceil(count / pagination.value.rows));
  if (pagination.value.page > lastPage) {
    pagination.value.page = lastPage;
    return true;
  }
  return false;
};

const refresh = async (searchQuery = '', filterMode = 'all') => {
  pagination.value.page = 1;
  await loadPage(1, searchQuery, filterMode);
};

// 搜索方法
const search = (query, filterMode = 'all') => {
  currentSearch.value = query;
  currentFilter.value = filterMode;
  refresh(query, filterMode);
};

// 筛选方法
const filter = (query, filterMode) => {
  currentSearch.value = query;
  currentFilter.value = filterMode;
  refresh(query, filterMode);
};

const refreshCurrentResults = async () => {
  const requestId = ++activeRequestId;
  loading.value = true;
  try {
    const { count, items } = await fetchPage(pagination.value.page);
    if (requestId !== activeRequestId) {
      return;
    }
    applyPageData({ count, items });
    clampPage(count);
  } catch (error) {
    if (requestId === activeRequestId) {
      console.error("Failed to refresh links:", error);
    }
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false;
    }
  }
};

const createLink = () => {
  openLinkPanel()
    .then(() => {
      refreshCurrentResults();
    })
    .catch(() => {
      // 用户取消或创建失败，不需要刷新
    });
};

// 获取模式标签 - 使用计算属性确保响应式
const getModeLabel = computed(() => (mode) => {
  const modeOption = getModeList().find(m => m.value === mode);
  return modeOption ? modeOption.label : mode;
});

// 模板中使用普通函数，避免 ref 解包问题
const modeLabel = (mode) => getModeLabel.value(mode);

const fullLinkOf = (item) => `${location.protocol}//${location.host}/${item.slug}`;

// 复制短链接
const onClipboard = (item) => {
  const fullLink = fullLinkOf(item);
  copyText(fullLink, undefined, (error) => {
    if (!error) {
      copiedSlug.value = item.slug;
      setTimeout(() => {
        if (copiedSlug.value === item.slug) {
          copiedSlug.value = null;
        }
      }, 1000);
    }
  });
};

const openQRCode = (item) => {
  qrItem.value = item;
  qrVisible.value = true;
};

const openStats = (item) => {
  statsItem.value = item;
  statsVisible.value = true;
};

const emitRefresh = (item) => {
  refreshCurrentResults();
  toast({
    title: t("messages.updateSuccess"),
    description: t("messages.linkUpdated", { slug: item.slug }),
    class: "rounded-2xl",
  });
};

const handleOperate = async (item, operate) => {
  switch (operate) {
    case "edit":
      openLinkPanel({ ...item, value: undefined, key: undefined })
        .then(() => emitRefresh(item))
        .catch(() => {
          // do nothing
        });
      break;
    case "duplicate":
      openLinkPanel({
        ...item,
        value: undefined,
        key: undefined,
        creation: undefined,
        slug: `${item.slug}-copy`,
      })
        .then(() => emitRefresh(item))
        .catch(() => {
          // do nothing
        });
      break;
    case "qr-code":
      openQRCode(item);
      break;
    case "analytics":
      openStats(item);
      break;
    case "delete":
      fetch(`/api/?action=delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug }),
      })
        .then((res) => res.json())
        .then((rv) => {
          if (rv.code === 0) {
            toast({
              title: t("messages.deleteSuccess"),
              description: t("messages.linkDeleted", { slug: item.slug }),
              class: "rounded-2xl",
            });
            refreshCurrentResults();
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
      break;
  }
};

const operates = computed(() => [
  { name: t("common.edit"), icon: "icon-[material-symbols--edit-document-outline]", operate: "edit" },
  { name: t("slugCard.actions.duplicate"), icon: "icon-[material-symbols--file-copy-outline]", operate: "duplicate" },
  {
    name: t("common.delete"),
    icon: "icon-[material-symbols--delete-outline]",
    operate: "delete",
    class: "!text-destructive hover:!bg-destructive hover:!text-destructive-foreground",
  },
]);

onMounted(() => {
  refresh();
});

defineExpose({ refresh, search, filter, createLink });
</script>
<template>
  <div class="w-full">
    <!-- 搜索/筛选状态提示 -->
    <div v-if="currentSearch" class="mb-4 p-4 bg-muted/50 rounded-lg">
      <div class="flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          <span v-if="currentSearch && currentFilter !== 'all'">
            {{ t('table.searchInType', {
              query: currentSearch, type: modeLabel(currentFilter), count:
                pagination.count }) }}
          </span>
          <span v-else-if="currentSearch">
            {{ t('table.searchResults', { query: currentSearch, count: pagination.count }) }}
          </span>
          <span v-else-if="currentFilter !== 'all'">
            {{ t('table.filterResults', { type: modeLabel(currentFilter), count: pagination.count }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 加载状态(仅首次加载/无数据时显示) -->
    <div v-if="loading && tableData.length === 0" class="mb-4 text-center text-muted-foreground">
      <div class="flex items-center justify-center gap-2">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-4 w-4" />
        <span>{{ t('table.searching') }}</span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="tableData.length === 0" class="text-center py-24">
      <div class="max-w-md mx-auto space-y-6">
        <div class="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
          <i class="icon-[material-symbols--link] h-10 w-10 text-muted-foreground" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-semibold tracking-tight">
            {{ (currentSearch || currentFilter !== 'all') ? t('table.noResults') : t('table.noData') }}
          </h3>
          <p class="text-muted-foreground">
            {{ (currentSearch || currentFilter !== 'all') ? t('table.tryAdjustFilters') : t('table.createFirstLink') }}
          </p>
        </div>
        <div v-if="!(currentSearch || currentFilter !== 'all')">
          <Button @click="createLink" class="gap-2">
            <i class="icon-[material-symbols--add] h-4 w-4" />
            {{ t('table.createLink') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div v-else class="relative bg-card overflow-hidden">
      <!-- min-w 保证小屏幕下表格整体横向滚动，而非压缩列宽 -->
      <Table class="table-fixed min-w-[64rem]">
        <TableHeader class="bg-muted/50">
          <TableRow class="hover:bg-transparent">
            <TableHead class="w-16">{{ t('table.columns.mode') }}</TableHead>
            <TableHead class="px-4 w-[20%] min-w-[220px]">{{ t('table.columns.slug') }}</TableHead>
            <TableHead class="w-[25%] min-w-[160px]">{{ t('table.columns.url') }}</TableHead>
            <TableHead class="w-[25%] min-w-[120px]">{{ t('table.columns.notes') }}</TableHead>
            <TableHead class="w-42">{{ t('table.columns.createdAt') }}</TableHead>
            <TableHead class="w-28 sticky right-0 z-10 border-l border-border bg-muted/50">{{ t('table.columns.actions') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="item in tableData" :key="item.oid" class="group">
            <!-- 模式 -->
            <TableCell>
              <Badge variant="secondary" class="capitalize rounded-full">{{ modeLabel(item.mode) }}</Badge>
            </TableCell>
            <!-- 短链 -->
            <TableCell class="px-4">
              <div class="min-w-0 flex flex-row flex-wrap">
                <Button variant="ghost" size="icon"
                  class="inline-flex items-center justify-center h-5 w-5 align-middle mr-1 text-muted-foreground"
                  :class="copiedSlug === item.slug && '!text-green-600 !bg-green-50'" @click="onClipboard(item)">
                  <i v-if="copiedSlug !== item.slug"
                    class="icon-[material-symbols--content-copy-outline-rounded] h-3 w-3" />
                  <i v-else class="icon-[material-symbols--check] h-3 w-3" />
                </Button>
                <a :href="fullLinkOf(item)" target="_blank"
                  class="font-medium text-blue-500 hover:underline truncate block">
                  {{ item.displayName || item.slug }}
                </a>
                <!-- <span class="text-xs text-muted-foreground truncate flex-1 w-full" :title="item.slug">
                  {{ item.slug }}
                </span> -->
              </div>
            </TableCell>
            <!-- 目标链接 -->
            <TableCell>
              <span class="text-sm text-muted-foreground truncate block" :title="item.url">
                {{ item.url }}
              </span>
            </TableCell>
            <!-- 备注 -->
            <TableCell>
              <span class="text-sm text-muted-foreground truncate block" :title="item.notes">
                {{ item.notes || '-' }}
              </span>
            </TableCell>
            <!-- 创建时间 -->
            <TableCell>
              <span class="text-sm text-muted-foreground whitespace-nowrap">
                {{ format(new Date(item.createdAt * 1000), 'yyyy-MM-dd HH:mm') }}
              </span>
            </TableCell>
            <!-- 操作 -->
            <TableCell class="sticky right-0 z-10 bg-card border-l border-border pr-4">
              <div class="flex items-center justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  :title="t('stats.analytics')"
                  @click="openStats(item)"
                >
                  <i class="icon-[material-symbols--monitoring] h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  :title="t('slugCard.actions.qrCode')"
                  @click="openQRCode(item)"
                >
                  <i class="icon-[material-symbols--qr-code] h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon"
                      class="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
                      <i class="icon-[material-symbols--more-vert] h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="rounded-2xl backdrop-blur-md bg-white/60">
                    <DropdownMenuItem v-for="op in operates" :key="op.operate"
                      :class="['flex items-center gap-2 cursor-pointer text-muted-foreground rounded-full px-3', op.class]"
                      @click="handleOperate(item, op.operate)">
                      <i :class="op.icon + ' h-4 w-4'" />
                      <span>{{ op.name }}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <!-- 翻页/刷新时保持表格显示，覆盖层提示加载中 -->
      <div v-if="loading"
        class="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <i class="icon-[material-symbols--progress-activity] animate-spin h-5 w-5 text-muted-foreground" />
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="tableData.length > 0" class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="text-sm text-muted-foreground">
        {{ t('pagination.total', { count: pagination.count }) }}
      </div>
      <Pagination
        v-model:page="pagination.page"
        :total="pagination.count"
        :items-per-page="pagination.rows"
        :sibling-count="1"
        :show-edges="true"
      >
        <PaginationList v-slot="{ items }" class="flex items-center gap-1">
          <PaginationFirst class="text-muted-foreground" />
          <PaginationPrev class="text-muted-foreground" />
          <template v-for="(item, index) in items" :key="index">
            <PaginationListItem v-if="item.type === 'page'" :value="item.value" as-child>
              <Button
                :variant="item.value === pagination.page ? 'default' : 'outline'"
                :class="['h-8 w-8 p-0 rounded-full shadow-none', item.value !== pagination.page && 'text-muted-foreground']"
              >
                {{ item.value }}
              </Button>
            </PaginationListItem>
            <PaginationEllipsis v-else :index="index" class="text-muted-foreground" />
          </template>
          <PaginationNext class="text-muted-foreground" />
          <PaginationLast class="text-muted-foreground" />
        </PaginationList>
      </Pagination>
    </div>

    <!-- QR码对话框 -->
    <QRCodeDialog v-model:visible="qrVisible" :short-url="qrItem ? fullLinkOf(qrItem) : ''" />
    <!-- 统计对话框 -->
    <StatsDialog v-model:visible="statsVisible" :item="statsItem" />

    <!-- 创建链接弹窗 -->
    <CreateLinkDialog />
  </div>
</template>
