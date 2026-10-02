<template>
  <router-view />
</template>

<script setup lang="ts">
// The faces are served with the site: IM Fell, the storybook face, and EB Garamond, the
// classic book face. The browser only fetches the one the reader has chosen.
import '@fontsource/im-fell-dw-pica/400.css'
import '@fontsource/im-fell-dw-pica/400-italic.css'
import '@fontsource-variable/eb-garamond/wght.css'
import '@fontsource-variable/eb-garamond/wght-italic.css'
</script>
