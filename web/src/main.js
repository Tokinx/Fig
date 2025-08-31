import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
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
      meta: { title: "登录" },
    },
    {
      path: "/manage",
      component: () => import("./pages/Manage/Manage.vue"),
      meta: { title: "管理短链接" },
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./pages/404/404.vue"),
      meta: { title: "页面不存在" },
    },
  ],
});
app.use(router);

app.mount("#app");
