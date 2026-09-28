<template>
  <q-page class="about">
    <header class="site-bar">
      <router-link to="/" class="text-button"
        ><q-icon name="arrow_back" /> {{ t.allTales }}</router-link
      >
    </header>

    <article v-if="lang === 'en'" class="about-text">
      <h1>About the tales</h1>
      <p>
        The tales come from <em>Norske Folkeeventyr</em>, the Norwegian folk tales Peter Christen
        Asbjørnsen and Jørgen Moe collected in the 1800s.
      </p>
      <p>Every tale comes in four editions:</p>
      <ul>
        <li><b>For children</b> is shorter, gentler and made for reading aloud.</li>
        <li><b>Classic</b> follows the old tale in plain, easy Norwegian.</li>
        <li><b>Modern</b> moves the tale to today's Norway.</li>
        <li><b>English</b> retells the classic tale in English.</li>
      </ul>
      <p>
        The texts were retold, and the pictures drawn, with the help of AI, following a written plan
        for every tale.
      </p>
    </article>

    <article v-else class="about-text">
      <h1>Om eventyrene</h1>
      <p>
        Eventyrene er hentet fra <em>Norske Folkeeventyr</em>, som Peter Christen Asbjørnsen og
        Jørgen Moe samlet på 1800-tallet.
      </p>
      <p>Hvert eventyr finnes i fire utgaver:</p>
      <ul>
        <li><b>For barn</b> er kortere, snillere og laget for høytlesning.</li>
        <li><b>Klassisk</b> følger det gamle eventyret på lett, levende norsk.</li>
        <li><b>Moderne</b> flytter eventyret til dagens Norge.</li>
        <li><b>English</b> forteller det klassiske eventyret på engelsk.</li>
      </ul>
      <p>
        Tekstene er fortalt på nytt, og bildene tegnet, med hjelp av kunstig intelligens, etter en
        skrevet plan for hvert eventyr.
      </p>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { useText } from 'src/logic/i18n'

const { t, lang } = useText()
</script>

<style lang="scss" scoped>
.about {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 max(20px, env(safe-area-inset-left)) 64px;
}

.site-bar {
  padding: 18px 0;
}

.about-text {
  font-family: var(--serif);
  font-size: 1.12rem;
  line-height: 1.7;
  color: var(--ink-soft);
}

.about-text h1 {
  margin: 24px 0 20px;
  font-size: clamp(2rem, 5vw, 2.8rem);
  line-height: 1.1;
}

.about-text b {
  color: var(--ink);
}

.about-text li {
  margin-bottom: 6px;
}
</style>
