<template>
  <q-page class="q-pa-md">
    <div class="text-h6">All Images</div>
    <div class="text-caption">
      All images in the server, included all the rejected images. Nr of images: {{ images.length }}
    </div>
    <q-toggle v-model="hdImages" label="Show HD Images" @update:model-value="fetchImages" />
    <div class="row">
      <template v-for="(image) in images" :key="image">
        <div class="col-lg-4 col-sm-6 col-12 q-pa-sm">
          <q-card>
            <q-img :src="image" :alt="image">
              <q-tooltip>
                {{ image }}
              </q-tooltip>
            </q-img>
          </q-card>
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { createNotify } from "src/logic/utils";
import { onMounted, ref } from "vue";
const images = ref<string[]>([]);
const hdImages = ref(false);
async function fetchImages() {
  try {
    let url = '/all_webp.json';
    if (hdImages.value) {
      url = '/all_png.json';
    }
    const response = await fetch(url);
    const data = await response.json();
    console.log(data);
    images.value = data.images;
  } catch (err: unknown) {
    console.error(err);
    createNotify((err as Error).message)
  }

}
onMounted(() => {
  console.log('onMounted');
  fetchImages();
});
</script>

<style lang="scss" scoped></style>
