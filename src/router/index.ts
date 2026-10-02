import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : (process.env.VUE_ROUTER_MODE === 'history' ? createWebHistory : createWebHashHistory);

  // Links from before the site had real addresses look like /#/story/askesv.
  if (!process.env.SERVER && window.location.hash.startsWith('#/')) {
    window.history.replaceState(null, '', window.location.hash.slice(1));
  }

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Every page is built as a folder with an index.html (scripts/build-share-pages.mjs), and
  // the host serves those only for the address with a trailing slash. Keeping addresses in
  // that form means a copied link opens the tale's own page, with its preview.
  Router.beforeEach((to) =>
    to.path.endsWith('/')
      ? true
      : { path: `${to.path}/`, query: to.query, hash: to.hash, replace: true },
  );

  // Pages that know a better title set it once they have loaded (StoryPage).
  Router.afterEach(() => {
    if (!process.env.SERVER) document.title = 'Eventyr';
  });

  return Router;
});
