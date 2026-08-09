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
// 全量模式：后端一次下发全部数据，本地完成搜索/筛选/分页
const allItems = ref([]);
// 分页模式：数据量超过后端阈值时，由后端按需分页(见 api.js MAX_FULL_LIST)
const serverItems = ref([]);
const isFullMode = ref(true);
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

// 本地过滤(全量模式，逻辑与后端一致：大小写不敏感子串匹配)
const localFiltered = computed(() => {
  let list = allItems.value;
  const searchTerm = currentSearch.value.trim().toLowerCase();
  if (searchTerm) {
    list = list.filter(
      (x) =>
        (x.key || "").toLowerCase().includes(searchTerm) ||
        (x.url || "").toLowerCase().includes(searchTerm) ||
        (x.displayName || "").toLowerCase().includes(searchTerm) ||
        (x.notes || "").toLowerCase().includes(searchTerm),
    );
  }
  if (currentFilter.value && currentFilter.value !== "all") {
    list = list.filter((x) => x.mode === currentFilter.value);
  }
  return list;
});

// 本地分页(全量模式)
const localItems = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.rows;
  return localFiltered.value.slice(start, start + pagination.value.rows);
});

// 表格数据与总数(按模式区分)
const tableData = computed(() => (isFullMode.value ? localItems.value : serverItems.value));
const totalCount = computed(() => (isFullMode.value ? localFiltered.value.length : pagination.value.count));
const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / pagination.value.rows)));

// 页码越界自动回退(删除数据后当前页可能超出范围)
watch(pageCount, (pc) => {
  if (pagination.value.page > pc) {
    pagination.value.page = pc;
  }
});

// 拉取列表：全量模式一次拿全部；分页模式携带筛选分页参数
const load = async ({ page = pagination.value.page, searchQuery = currentSearch.value, filterMode = currentFilter.value } = {}) => {
  const requestId = ++activeRequestId;
  loading.value = true;

  try {
    const body = {};
    if (!isFullMode.value) {
      body.rows = pagination.value.rows;
      body.page = page;
      if (searchQuery) body.search = searchQuery;
      if (filterMode && filterMode !== "all") body.mode = filterMode;
    }

    const response = await fetch(`/api/?action=get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!response.ok || result.code !== 0) {
      throw new Error(result.msg || "Failed to fetch links");
    }

    const data = result.data || {};
    if (requestId !== activeRequestId) {
      return;
    }

    if (data.full) {
      isFullMode.value = true;
      allItems.value = data.results || [];
      pagination.value.count = data.count ?? allItems.value.length;
    } else {
      isFullMode.value = false;
      serverItems.value = data.results || [];
      pagination.value.count = data.count ?? 0;
      pagination.value.page = data.page ?? 1;
    }
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

// 页码变化：全量模式本地切片自动生效，无需请求；分页模式请求后端
watch(() => pagination.value.page, (page) => {
  if (!isFullMode.value) {
    load({ page });
  }
});

const refresh = async (searchQuery = '', filterMode = 'all') => {
  currentSearch.value = searchQuery;
  currentFilter.value = filterMode;
  pagination.value.page = 1;
  await load({ page: 1, searchQuery, filterMode });
};

// 搜索方法(全量模式纯本地，分页模式请求后端)
const search = (query, filterMode = 'all') => {
  currentSearch.value = query;
  currentFilter.value = filterMode;
  pagination.value.page = 1;
  if (!isFullMode.value) {
    load({ page: 1, searchQuery: query, filterMode });
  }
};

// 筛选方法
const filter = (query, filterMode) => search(query, filterMode);

const refreshCurrentResults = () => load();

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
                totalCount }) }}
          </span>
          <span v-else-if="currentSearch">
            {{ t('table.searchResults', { query: currentSearch, count: totalCount }) }}
          </span>
          <span v-else-if="currentFilter !== 'all'">
            {{ t('table.filterResults', { type: modeLabel(currentFilter), count: totalCount }) }}
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
          <TableRow v-for="item in tableData" :key="item.key" class="group">
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
        {{ t('pagination.total', { count: totalCount }) }}
      </div>
      <Pagination
        v-model:page="pagination.page"
        :total="totalCount"
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
