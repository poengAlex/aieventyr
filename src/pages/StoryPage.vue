<template>
  <q-page class="q-pa-md">
    <div v-if="false" class="q-mb-md">
      <q-btn-group outline>
        <q-btn v-for="(variant, index) in VARIANTS" :key="variant" :label="VARIANTS[index]"
          :flat="settings.variant !== variant" :color="settings.variant === variant ? 'primary' : 'secondary'"
          @click="loadVariant(variant)" />
      </q-btn-group>
    </div>
    <div class="_q-mb-sm _q-pa-sm q-mb-md">
      <variant-selector></variant-selector>
    </div>
    <div class="q-mb-md">
      <q-card>
        <q-card-section>
          <q-img :src="mainImage" class="q-mb-md" />
          <div v-if="section" class="text-h6">
            {{ section.title }}
          </div>
          <div v-if="text" v-html="formattedText">
          </div>
          <div v-else>
            <q-spinner color="primary" />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div class="q-mb-md">
      <q-card class="_q-pa-md" flat>
        <div class="full-width row justify-between q-mb-md">
          <q-btn v-if="prevSection" :to="`/story/${prevSection.id}`" label="Forrige eventyr" />
          <q-btn v-if="nextSection" :to="`/story/${nextSection.id}`" label="Neste eventyr" />
        </div>
      </q-card>
    </div>
    <div class="q-mb-md">
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-h6">
            Portretter av karakterer
          </div>
          <q-carousel swipeable animated v-model="slide" thumbnails infinite arrows>
            <q-carousel-slide v-for="portrait in portraits" :key="portrait.name" :name="portrait.name"
              :img-src="portrait.path">

            </q-carousel-slide>
          </q-carousel>
        </q-card-section>
        <q-card-section>
          <div class="text-h6">
            {{ portraits.find((p) => p.name === slide)?.name }}
          </div>
        </q-card-section>
        <q-card-section>
          {{ portraits.find((p) => p.name === slide)?.description }}
        </q-card-section>
      </q-card>
    </div>
  </q-page>

</template>

<script setup lang="ts">
import { useSettingsStore, VARIANTS, VariantTypes } from "src/stores/settings";
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import VariantSelector from "src/components/VariantSelector.vue";

type Section = {
  title: string;
  id: string;
  start: number;
  stop: number;
};

const settings = useSettingsStore();
const route = useRoute();
const id = ref(route.params.id);
const text = ref("");
const mainImage = ref("");
// Computed property for preserving spaces and line breaks
const formattedText = ref("");
const portraits = ref<{ name: string, path: string, description: string }[]>([]);
const slide = ref("");
const sectionIndex = ref(0);
const section = ref<Section | undefined>(undefined);
const prevSection = ref<Section | undefined>(undefined);
const nextSection = ref<Section | undefined>(undefined);

settings.$subscribe((mutation, state) => {
  loadVariant(state.variant);
});

const variants = ["simplified", "child", "english", "modern"];
const variantLabels = {
  simplified: "Simplified",
  child: "Child-friendly",
  english: "English",
  modern: "Modern",
};

const escapeHtml = (str: string) => {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};


const loadVariant = async (variant: VariantTypes | "child") => {
  console.log("Loading variant", variant);
  settings.variant = variant as VariantTypes;
  if (variant === "child-friendly") {
    variant = "child";
  }
  let variantPath = `/output/variants/${id.value}/${variant}.txt`;
  let imagePath = `/output/mainImages/${id.value}_${variant}.png`;
  if (variant === "raw" || variant === "cleaned" || variant === "simplified") {
    imagePath = `/output/mainImages/${id.value}.png`;
  }
  if (variant === "raw") {
    variantPath = `/output/section/${id.value}.txt`;
  } else if (variant === "cleaned") {
    variantPath = `/output/cleaned/${id.value}.txt`;
  }
  const response = await fetch(variantPath);
  text.value = await response.text();
  formattedText.value = escapeHtml(text.value).replace(/\n/g, "<br>");


  mainImage.value = imagePath;
};

const loadPortraits = async () => {
  const response = await fetch(`/output/imagesGen/${id.value}/characters.json`);
  const data = await response.json();
  portraits.value = data.characters;
  //Add path to each portrait /output/imagesGen/${id.value}/${name}.png
  portraits.value.forEach((portrait) => {
    portrait.path = `/output/imagesGen/${id.value}/${portrait.name}.png`;
  });
  if (portraits.value !== undefined && portraits.value.length > 0) {
    slide.value = portraits.value[0]!.name;
  }
};



const loadSections = async () => {
  const response = await fetch("/sections.json");
  const data = await response.json();
  console.log("Sections", data);
  sectionIndex.value = data.findIndex((section: any) => section.id === id.value);
  section.value = data[sectionIndex.value];
  console.log("Section:", section.value);
  prevSection.value = undefined;
  nextSection.value = undefined;
  if (sectionIndex.value > 0) {
    prevSection.value = data[sectionIndex.value - 1]
  }
  if (sectionIndex.value < data.length - 1) {
    nextSection.value = data[sectionIndex.value + 1]
    if (nextSection.value?.start === -1) {
      nextSection.value = undefined;
    }
  }
};

function updateData() {
  loadVariant(settings.variant);
  loadPortraits();
  loadSections();
}

onMounted(() => {
  updateData();
});

watch(() => route.params.id, () => {
  id.value = route.params.id;
  updateData();
});
</script>

<style lang="scss" scoped>
.q-card {
  max-width: 600px;
  margin: 0 auto;
}
</style>
