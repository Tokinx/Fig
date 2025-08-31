import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import { i18n } from "./locales";
import "./style.css";
import "./assets/index.css";
import App from "./App.vue";

// // 全量导入schade-cn
// import "@/components/ui/";


const app = createApp(App);
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: () => import("./pages/Login/Login.vue"),
      meta: { titleKey: "pages.loginTitle" },
    },
    {
      path: "/manage",
      component: () => import("./pages/Manage/Manage.vue"),
      meta: { titleKey: "pages.manageTitle" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./pages/404/404.vue"),
      meta: { titleKey: "pages.notFoundTitle" },
    },
  ],
});

// 路由守卫：动态设置页面标题
router.beforeEach((to) => {
  if (to.meta?.titleKey) {
    // 使用nextTick确保i18n已经完全加载
    const { t } = i18n.global
    document.title = t(to.meta.titleKey)
  }
});

app.use(router);
app.use(i18n);

app.mount("#app");
