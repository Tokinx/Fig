<script setup>
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast/use-toast";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const password = ref("");
const loading = ref(false);

let errMsg = ref("");

const SingIn = async (event) => {
  event.preventDefault();
  if (loading.value) return; // 防止重复提交
  if (!password.value) {
    errMsg.value = t("auth.passwordRequired");
    return;
  }
  if (password.value.length < 6 || password.value.length > 32) {
    errMsg.value = t("auth.passwordLength");
    return;
  }
  errMsg.value = ""; // 清除错误信息
  loading.value = true;

  try {
    const response = await fetch(`/api/?action=login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: password.value }),
    });

    const result = await response.json();

    if (result.code !== 0) {
      errMsg.value = result.msg || t("auth.loginFailed");
      return;
    }

    // 登录成功，跳转到首页
    setTimeout(() => {
      location.href = "/manage";
    }, 100);
  } catch (error) {
    errMsg.value = t("auth.networkError");
    console.error("Login error:", error);
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 1000);
  }
};
</script>

<!-- class="invalid:focus:border-red-500" -->
<template>
  <form @submit="SingIn" class="flex flex-col gap-3">
    <div class="flex flex-col gap-1">
      <Input
        type="password"
        :placeholder="t('auth.enterPassword')"
        auto-capitalize="none"
        auto-correct="off"
        class="rounded-full"
        :disabled="loading"
        v-model="password"
      />
      <!-- err message -->
      <div :class="['text-red-500 text-xs', { invisible: !errMsg }]">{{ errMsg || "Err message" }}</div>
    </div>
    <Button :disabled="loading" class="w-full rounded-full">
      {{ t("auth.signIn") }}
      <i v-if="!loading" class="icon-[mingcute--arrow-right-line] text-base ml-2" />
      <i v-else class="icon-[mingcute--loading-fill] animate-spin text-base ml-2" />
    </Button>
  </form>
</template>
