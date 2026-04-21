import { createRouter, createWebHistory } from 'vue-router'

const Empty = { template: '<div />' }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/:game/:view', component: Empty },
    { path: '/:game', redirect: to => `${to.path}/fixtures` },
    { path: '/', redirect: '/TT_Doubles/fixtures' },
    { path: '/:pathMatch(.*)*', redirect: '/TT_Doubles/fixtures' },
  ],
})

export default router
