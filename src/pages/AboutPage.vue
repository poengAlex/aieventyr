<template>
  <q-page class="about">
    <header class="running-head">
      <router-link to="/" class="caps-link">‹ {{ t.contents }}</router-link>
    </header>

    <article v-if="lang === 'en'" class="about-text">
      <div class="ornament" aria-hidden="true"><i /></div>
      <h1>About the tales</h1>
      <p>
        The tales come from <em>Norske Folkeeventyr</em>, the Norwegian folk tales Peter Christen
        Asbjørnsen and Jørgen Moe collected in the 1800s.
      </p>
      <p>Every tale comes in four editions:</p>
      <dl>
        <dt class="caps">For children</dt>
        <dd>shorter, gentler and made for reading aloud.</dd>
        <dt class="caps">Classic</dt>
        <dd>the old tale in plain, easy Norwegian.</dd>
        <dt class="caps">Modern</dt>
        <dd>the tale moved to today's Norway.</dd>
        <dt class="caps">English</dt>
        <dd>the classic tale in English.</dd>
      </dl>
      <p>
        The texts were retold, and the pictures drawn, with the help of AI, following a written plan
        for every tale.
      </p>
    </article>

    <article v-else class="about-text">
      <div class="ornament" aria-hidden="true"><i /></div>
      <h1>Om eventyrene</h1>
      <p>
        Eventyrene er hentet fra <em>Norske Folkeeventyr</em>, som Peter Christen Asbjørnsen og
        Jørgen Moe samlet på 1800-tallet.
      </p>
      <p>Hvert eventyr finnes i fire utgaver:</p>
      <dl>
        <dt class="caps">For barn</dt>
        <dd>kortere, snillere og laget for høytlesning.</dd>
        <dt class="caps">Klassisk</dt>
        <dd>det gamle eventyret på lett, levende norsk.</dd>
        <dt class="caps">Moderne</dt>
        <dd>eventyret flyttet til dagens Norge.</dd>
        <dt class="caps">English</dt>
        <dd>det klassiske eventyret på engelsk.</dd>
      </dl>
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
  max-width: 640px;
  margin: 0 auto;
  padding: max(18px, env(safe-area-inset-top)) max(22px, env(safe-area-inset-right)) 80px
    max(22px, env(safe-area-inset-left));
}

.about-text {
  padding-top: 48px;
  font-size: 1.28rem;
  line-height: 1.55;
}

.about-text h1 {
  margin: 18px 0 28px;
  text-align: center;
  font-size: clamp(2rem, 6vw, 2.6rem);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.about-text p {
  margin: 0 0 1em;
}

dl {
  margin: 0 0 1.2em;
}

dt {
  margin-top: 12px;
  color: var(--accent);
}

dd {
  margin: 0;
  color: var(--ink-soft);
}
</style>
