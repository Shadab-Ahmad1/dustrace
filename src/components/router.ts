import {createRouter, createWebHistory} from "vue-router";
import {Session} from "@wharfkit/session";
import {inject, Ref} from "vue";
import Inventory from "./pages/Inventory.vue";
import Race from "./pages/Race.vue";
import Home from "./pages/Home.vue";
import Stable from "./pages/Stable.vue";
import Results from "./pages/Results.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {path: "/", name: "home", component: Home},
    {
      path: "/results",
      component: Results,
      meta: {
        requireAuth: false
      }
    },
    {
      path: "/race",
      component: Race,
      meta: {
        requireAuth: false
      }
    },
    {
      path: "/stable",
      component: Inventory,
      meta: {
        requireAuth: false
      }
    },
    {
      path: "/inventory",
      component: Inventory,
      meta: {
        requireAuth: false
      }
    },
  ]
});

router.beforeEach((to, from, next) => {
  if (to.matched.some(r => r.meta.requireAuth)) {
    const session = inject<Ref<Session | undefined>>("session")!;
    if (session.value === undefined) {
      next({name: "home"})
    } else {
      next();
    }
  } else {
    next();
  }
})

export default router;