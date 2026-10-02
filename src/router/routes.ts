import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: 'story/:id', component: () => import('pages/StoryPage.vue') },
      { path: 'about', component: () => import('pages/AboutPage.vue') },
      { path: 'om', redirect: '/about/' },
      // Pages from the earlier design.
      { path: 'images', redirect: '/' },
      { path: 'settings', redirect: '/' },
      // Always last.
      { path: ':catchAll(.*)*', component: () => import('pages/ErrorNotFound.vue') },
    ],
  },
]

export default routes
