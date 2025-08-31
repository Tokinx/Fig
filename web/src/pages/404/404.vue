<script setup>
import { ref } from "vue";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { alert } from "@/components/Alert/use-alert";

const DATA = ref({
  PAGE: window.__PAGE__,
  LINK: window.__URL__,
  NOTES: window.__NOTES__,
});

const host = location.host;
const originalUrl = location.origin;

const passcode = ref("");
const onPasscode = (e) => {
  e.preventDefault();
  console.log(passcode.value);

  fetch("/api/?action=sesame", {
    method: "POST",
    body: JSON.stringify({ slug: location?.pathname?.replace(/^\//, ""), passcode: passcode.value }),
  })
    .then((res) => res.json())
    .then(({ data }) => {
      if (data) {
        // location.href = res.data;
        console.log(data);
      } else {
        alert({
          title: "Error",
          description: res.msg,
        });
      }
    });
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center overflow-x-hidden">
    <template v-if="DATA.PAGE === 'passcode'">
      <Card class="flex">
        <div class="w-[180px] shrink-0 flex items-center justify-center">
          <span class="icon-[mingcute--safe-lock-line] text-[10rem] opacity-5"></span>
        </div>
        <Separator orientation="vertical" class="!h-auto m-6 ml-0" />
        <div class="flex flex-col w-[320px] p-5 pl-0">
          <h1 class="flex items-center gap-1 text-2xl font-bold">
            <i class="icon-[mingcute--safe-lock-line]"></i>
            Passcode protected
          </h1>
          <span class="text-xs text-slate-500 mt-2">
            This page is passcode protected, please enter your passcode to continue your visit.
          </span>
          <form class="flex items-center h-32" @submit="onPasscode">
            <Input type="passcode" placeholder="Passcode" class="bg-white rounded-r-none" v-model="passcode" />
            <Button class="uppercase rounded-l-none w-28">Continue</Button>
          </form>
        </div>
      </Card>
    </template>
    <template v-else-if="DATA.PAGE === 'remind'">
      <Card class="flex">
        <div class="w-[180px] shrink-0 flex items-center justify-center">
          <span class="icon-[mingcute--safe-alert-line] text-[10rem] opacity-5"></span>
        </div>
        <Separator orientation="vertical" class="!h-auto m-6 ml-0" />
        <div class="flex flex-col w-[360px] p-5 pl-0">
          <h1 class="flex items-center gap-1 text-2xl font-bold">
            <i class="icon-[mingcute--safe-alert-line]"></i>
            Remind
          </h1>
          <span class="text-xs text-slate-500 mt-2">
            The website you visit may contain unknown security risks, please take care to protect personal information.
          </span>
          <div class="my-5 rounded bg-slate-100 p-3 break-words text-xs min-h-16">
            {{ DATA.LINK }}
          </div>
          <!-- 显示备注信息 -->
          <div v-if="DATA.NOTES && DATA.NOTES.trim()" class="mb-4 p-3 bg-blue-50 border-l-4 border-blue-200 rounded-r">
            <div class="flex items-start gap-2">
              <i class="icon-[material-symbols--sticky-note-2-outline] text-blue-500 text-sm mt-0.5 flex-shrink-0"></i>
              <div class="text-sm text-blue-700">
                <div class="font-medium mb-1">备注信息</div>
                <div class="text-xs leading-relaxed">{{ DATA.NOTES }}</div>
              </div>
            </div>
          </div>
          <a :href="DATA.LINK" class="flex justify-end">
            <Button variant="link" class="uppercase">
              Continue
              <i class="icon-[material-symbols--arrow-right-alt-rounded] text-lg ml-2" />
            </Button>
          </a>
        </div>
      </Card>
    </template>
    <template v-else-if="DATA.PAGE === 'cloaking'">
      <iframe :src="DATA.LINK" class="w-screen h-screen" frameborder="0" allowfullscreen> </iframe>
    </template>
    <template v-else>
      <div class="relative">
        <div class="absolute -left-40 -top-20 w-80 h-80 bg-blue-50 rounded-full"></div>
        <div class="absolute -right-20 -top-20 w-40 h-40 bg-blue-300 rounded-full"></div>
        <div class="relative p-8 bg-white/80 backdrop-blur rounded">
          <h1 class="text-slate-500 text-4xl font-bold">404 Not found</h1>
          <span class="text-slate-300 text-lg">Sorry, the page you visited does not exist.</span>
        </div>
      </div>
    </template>

    <footer class="absolute bottom-0 right-0">
      <div class="text-xs text-center text-slate-400 backdrop-blur w-full py-1 px-2 rounded-tl-lg bg-slate-300/[.3]">
        Powered by <a :href="originalUrl" class="text-slate-500">{{ host }}</a>
      </div>
    </footer>
  </div>
</template>
