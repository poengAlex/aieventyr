import { boot } from 'quasar/wrappers'
import posthog from 'posthog-js'
import { useRouter } from 'vue-router'
// console.log('Posthog token: ', process.env.POSTHOG_PROJECT_TOKEN)
// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app, router }) => {
  app.use({
    install(app) {
      app.config.globalProperties.$posthog = posthog.init(
        process.env.POSTHOG_PROJECT_TOKEN as string,
        {
          // api_host: 'https://eu.i.posthog.com',
          persistence: 'localStorage', //Removes the need for cookies -> But does it track correctly?
          // autocapture: false,
          // capture_pageview: false,
        },
      )
    },
  })
})
