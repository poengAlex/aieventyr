<template>
  <q-page class="q-pa-md">
    <h4>About This Project</h4>

    This website is the result of a simple but exciting project to bring <em>"Norske Folke-Eventyr"</em> into the
    digital age. Over a few evenings, I combined technology and creativity to create something that makes these
    timeless tales more accessible, engaging, and modern.

    <h5>The Process</h5>

    <h6>1. Getting the Data</h6>

    Finding the original texts in plain text was more challenging than expected. Eventually, I found a scanned version
    of the 6th revision from 1904. The text had to be extracted from the scanned pages using OCR tools, a process that
    took some trial and error to find the right solution.


    <h6>2. Extracting and Refining the Text</h6>

    Once the OCR tool successfully extracted the text, I faced challenges with errors and formatting. I used AI to
    clean and refine the text while preserving the original language and style. The outputs were saved in a structured
    format for easy use.


    <h6>3. Illustrating the Stories</h6>

    Using AI, I generated images to accompany each section of the book. This included:

    <ul>
      <li><strong>Character portraits:</strong> Each character was carefully illustrated using consistent prompts.</li>
      <li><strong>Main images:</strong> Every section received a main image that reflects its mood and themes.</li>
      <li><strong>Variants:</strong> Additional images were created for child-friendly, modern, and English text
        versions.</li>
    </ul>

    <h6>4. Creating Text Variants</h6>

    The original text was beautiful but difficult for modern readers. AI helped generate:

    <ul>
      <li>Simplified modern Norwegian text.</li>
      <li>A child-friendly version.</li>
      <li>An English translation.</li>
      <li>A reimagined version set in today’s society.</li>
    </ul>

    <h6>5. Website Design</h6>

    The user interface is simple and intuitive. Visitors can browse sections, toggle between text variants, and view
    images that bring the stories to life.


    <h5>Time and Tools</h5>

    <strong>Time spent:</strong> Two evenings, about 3 hours each.<br>
    <strong>AI involvement:</strong> Most of the code and content refinement was done using AI tools like ChatGPT and
    DALL-E. My role was to guide, refine, and stitch everything together.



    This project is a mix of cultural preservation and modern technology. It showcases how old stories can gain new
    life in a digital, AI-driven world. I hope you enjoy exploring this labor of love!

    <h5>V2 and V3</h5>
    Spent a couple more evenings fixing bugs, errors and outputs. V3 uses model o1.
    Some of the tales were incomplete, mostly because of the output token limitations of the 4o model.
    <br>
    Also, I optimized the images for web. The AI output were crazy big and made the site sluggish.

    <div class="text-caption q-mt-md">
      Written by AI, based on my notes.
    </div>

    <h4>
      Contact info
    </h4>
    Made by ChatGPT 4o and Alexander Bjørkmann
    <br>
    <a href="mailto:bbgruppen@outlook.com">BB Gruppen AS</a>
    <h4>GitHub</h4>
    MIT License - <a href="https://github.com/poengAlex/aieventyr" target="_blank">GitHub AI eventyr</a>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";

onMounted(() => {
  console.log('onMounted');
});
</script>

<style lang="scss" scoped>
h4,
h5,
h6 {
  margin-top: 1.0em;
  margin-bottom: 0.5em;
}
</style>
