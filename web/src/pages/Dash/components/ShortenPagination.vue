<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
} from "@/components/ui/pagination";

const props = defineProps({
  pagination: {
    type: Object,
    default: () => ({ count: 0, page: 1, rows: 10 }),
  },
});

const emit = defineEmits(["update:page"]);

const onPagination = (page) => {
  emit("update:page", page);
};

const pagination = ref(props.pagination);
</script>
<template>
  <Pagination
    v-slot="{ page }"
    :total="pagination.count"
    :itemsPerPage="pagination.rows"
    :sibling-count="1"
    :default-page="1"
    show-edges
    @update:page="onPagination"
  >
    <PaginationList v-slot="{ items }" class="flex items-center gap-1">
      <PaginationFirst />
      <PaginationPrev />
      <template v-for="(item, index) in items">
        <PaginationListItem v-if="item.type === 'page'" :key="index" :value="item.value" as-child>
          <Button size="icon" :variant="item.value === page ? 'default' : 'outline'">
            {{ item.value }}
          </Button>
        </PaginationListItem>
        <PaginationEllipsis v-else :key="item.type" :index="index" />
      </template>
      <PaginationNext />
      <PaginationLast />
    </PaginationList>
  </Pagination>
</template>
