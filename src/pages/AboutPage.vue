<template>
  <q-page class="about-page">
    <div class="about-card">
      <div class="eyebrow">About</div>
      <h1>Readable folktales, rebuilt with AI</h1>
      <p>
        I wanted the original Norwegian fairytales in a format that is easier to read and easier to
        revisit than the scanned source material.
      </p>
      <p>
        This is a 100% AI-made project. The stories are written by Claude, Anthropic's AI model, and
        the illustrations and character art are made with OpenAI's image models.
      </p>
      <div class="fact-grid">
        <div>
          <div class="fact-label">Text</div>
          <div class="fact-value">Every version retold by Claude from the cleaned 1840s source</div>
        </div>
        <div>
          <div class="fact-label">Art</div>
          <div class="fact-value">Each version gets its own illustrations and character portraits</div>
        </div>
        <div>
          <div class="fact-label">Pipeline</div>
          <div class="fact-value">One canonical content tree under <code>public/content</code></div>
        </div>
      </div>
      <div class="steps">
        <div class="steps-title">How the stories are made</div>
        <ol>
          <li>The original source is extracted from scanned folktale material.</li>
          <li>AI cleans the OCR and restores the text into a readable base version.</li>
          <li>
            Claude retells each tale four ways: simplified Norwegian, English, a read-aloud version for
            children and a modern retelling. Each is written as a story in its own right, not
            paraphrased line by line.
          </li>
          <li>Each version is illustrated scene by scene, with its own cast of characters.</li>
        </ol>
      </div>
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

.steps {
  margin-top: 24px;
  padding: 18px;
  border-radius: 20px;
  background: rgba(245, 238, 223, 0.88);
}

.steps-title {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(70, 62, 42, 0.62);
  margin-bottom: 10px;
}

ol {
  margin: 0;
  padding-left: 20px;
  color: rgba(47, 59, 51, 0.82);
  line-height: 1.7;
}
</style>
