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
      component: () => import("./pages/Home/Home.vue"),
    },
    {
      path: "/dash",
      component: () => import("./pages/Dash/Dash.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./pages/404/404.vue"),
    },
  ],
});
app.use(router);

app.mount("#app");
