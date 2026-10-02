<template>
  <q-page class="about">
    <header class="running-head">
      <router-link to="/" class="caps-link">‹ {{ t.contents }}</router-link>
    </header>

    <article v-if="lang === 'en'" class="about-text">
      <div class="ornament" aria-hidden="true"><i /></div>
      <h1>About the tales</h1>
      <p>
        I wanted the Norwegian folk tales in a form that is easier to read, and easier to come back
        to, than old scanned pages.
      </p>
      <p>
        The tales come from <em>Norske Folkeeventyr</em>, the Norwegian folk tales Peter Christen
        Asbjørnsen and Jørgen Moe collected in the 1800s. The text is based on the seventh edition
        from 1904, revised by Moltke Moe.
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

      <h2 class="caps">How they were made</h2>
      <ol>
        <li>
          Finding the tales as plain text was harder than expected. In the end I found a scanned
          copy, and the text had to be read off the pages with OCR, which took some trial and error.
        </li>
        <li>
          AI corrected the scanning errors and turned the pages into a clean base text, without
          changing the language.
        </li>
        <li>
          Claude, an AI model from Anthropic, retold every tale in the four editions. Each edition
          is written as a tale in its own right, not paraphrased line by line.
        </li>
        <li>
          The pictures were made with OpenAI's image models, scene by scene, following a written
          plan for every tale. Every character has a model sheet, so they look the same from picture
          to picture. The children's, classic and modern editions each have their own pictures.
        </li>
        <li>The readings were made with voices from ElevenLabs.</li>
      </ol>
      <p>
        So all of it was made with AI. My job was to guide it, correct it and stitch it all
        together.
      </p>
      <p>
        It is a small attempt at keeping an old heritage alive with new technology. I hope you enjoy
        the tales.
      </p>

      <footer class="colophon">
        <div class="ornament" aria-hidden="true"><i /></div>
        <p>Made by Alexander Bjørkmann</p>
        <p>
          <a href="https://github.com/poengAlex/aieventyr" target="_blank" rel="noopener"
            >Source code on GitHub</a
          >
        </p>
        <p><em>This page was written by AI, from my notes.</em></p>
      </footer>
    </article>

    <article v-else class="about-text">
      <div class="ornament" aria-hidden="true"><i /></div>
      <h1>Om eventyrene</h1>
      <p>
        Jeg ville ha de norske folkeeventyrene i en form som er lettere å lese, og lettere å komme
        tilbake til, enn gamle skannede sider.
      </p>
      <p>
        Eventyrene er hentet fra <em>Norske Folkeeventyr</em>, som Peter Christen Asbjørnsen og
        Jørgen Moe samlet på 1800-tallet. Teksten bygger på den syvende utgaven fra 1904, revidert
        av Moltke Moe.
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

      <h2 class="caps">Slik ble de laget</h2>
      <ol>
        <li>
          Det var vanskeligere enn ventet å finne eventyrene som ren tekst. Til slutt fant jeg en
          skannet utgave, og teksten måtte leses ut av sidene med tekstgjenkjenning. Det tok litt
          prøving og feiling.
        </li>
        <li>
          Kunstig intelligens rettet feilene fra skanningen og gjorde sidene om til en ren
          grunntekst, uten å endre språket.
        </li>
        <li>
          Claude, en KI-modell fra Anthropic, fortalte hvert eventyr på nytt i de fire utgavene.
          Hver utgave er skrevet som et eventyr i seg selv, ikke omskrevet linje for linje.
        </li>
        <li>
          Bildene er laget med bildemodellene til OpenAI, scene for scene, etter en skrevet plan for
          hvert eventyr. Alle personene har sitt eget modellark, så de ser like ut fra bilde til
          bilde. Barneutgaven, den klassiske og den moderne utgaven har hver sine bilder.
        </li>
        <li>Opplesningen er laget med stemmer fra ElevenLabs.</li>
      </ol>
      <p>
        Alt er altså laget med kunstig intelligens. Min jobb var å styre, rette opp og sy det hele
        sammen.
      </p>
      <p>
        Det er et lite forsøk på å ta vare på gammel kulturarv med ny teknologi. Jeg håper du får
        glede av eventyrene.
      </p>

      <footer class="colophon">
        <div class="ornament" aria-hidden="true"><i /></div>
        <p>Laget av Alexander Bjørkmann</p>
        <p>
          <a href="https://github.com/poengAlex/aieventyr" target="_blank" rel="noopener"
            >Kildekoden på GitHub</a
          >
        </p>
        <p><em>Denne siden er skrevet av KI, etter notatene mine.</em></p>
      </footer>
    </article>
  </q-page>
</template>

<script setup lang="ts">
import { watchEffect } from 'vue'
import { useText } from 'src/logic/i18n'

const { t, lang } = useText()

watchEffect(() => {
  document.title = `${t.value.about} · Eventyr`
})
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

.about-text h2 {
  margin: 2.4em 0 1.2em;
  text-align: center;
  color: var(--ink-muted);
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

ol {
  margin: 0 0 1.6em;
  padding-left: 1.4em;
}

li {
  margin-bottom: 0.7em;
  padding-left: 0.2em;
}

li::marker {
  color: var(--accent);
  font-variant-numeric: oldstyle-nums;
}

.colophon {
  margin-top: 56px;
  text-align: center;
  font-size: 0.98rem;
  color: var(--ink-muted);
}

.colophon .ornament {
  margin-bottom: 22px;
}

.colophon p {
  margin: 0 0 0.4em;
}

.colophon a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
</style>
