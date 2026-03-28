<template>
  <q-page class="about-page">
    <div class="about-card">
      <div class="eyebrow">About</div>
      <h1>A cleaner edition of Norske Folkeeventyr</h1>
      <p>
        This rebuild uses one canonical content system instead of multiple historical generations. Each
        story variant now has its own text, cover image, character set, character art, and audio bundle.
      </p>
      <p>
        The app is designed around two simple steps: browse the library, then open a focused reader.
        Behind the scenes, a single pipeline prepares the content structure and keeps model and prompt
        choices in configuration instead of hard-coded scripts.
      </p>
      <div class="fact-grid">
        <div>
          <div class="fact-label">Variants</div>
          <div class="fact-value">Original, cleaned, simplified, English, child-friendly, modern</div>
        </div>
        <div>
          <div class="fact-label">Pipeline</div>
          <div class="fact-value">One canonical content tree under <code>public/content</code></div>
        </div>
        <div>
          <div class="fact-label">Models</div>
          <div class="fact-value">Config-driven OpenAI text, image, and TTS generation</div>
        </div>
      </div>
      <p class="small-note">
        Source material is based on the scanned folktale collection and then rebuilt into reader-friendly
        variants for the app.
      </p>
    </div>
  </q-page>
</template>

<style lang="scss" scoped>
.about-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.about-card {
  background: rgba(255, 252, 244, 0.8);
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 16px 34px rgba(72, 55, 26, 0.08);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #7a5d30;
}

h1 {
  margin: 12px 0 16px;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
}

p {
  color: rgba(47, 59, 51, 0.82);
  font-size: 1rem;
  line-height: 1.7;
}

.fact-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
  margin: 22px 0;
}

.fact-grid > div {
  background: rgba(245, 238, 223, 0.88);
  border-radius: 18px;
  padding: 16px;
}

.fact-label {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(70, 62, 42, 0.62);
  margin-bottom: 8px;
}

.fact-value {
  font-weight: 600;
  line-height: 1.4;
}

.small-note {
  font-size: 0.95rem;
}
</style>
