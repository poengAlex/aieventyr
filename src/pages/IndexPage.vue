<template>
  <q-page class="q-pa-md">
    <div style="max-width: 720px; margin: 0 auto;">


      <!-- max width 500px and center it -->
      <div class="q-pa-sm">
        <!-- <q-card> -->
        <div class="text-h4">
          Norske Folkeeventyr – En AI-forbedret utgave
        </div>
        <div class="text-body2">
          En modernisert versjon av “Norske Folke-Eventyr”, fortalt av P. Chr. Asbjørnsen og Jørgen Moe i 6. utgave fra
          1904. Tekstene er gjort lettere å lese, språket er oppdatert, og levende AI-genererte illustrasjoner følger
          hver
          historie. Utforsk eventyrene slik de var, eller i varianter tilpasset barn, dagens samfunn eller engelske
          lesere.
        </div>
        <!-- </q-card> -->
      </div>

      <div class="_q-mb-sm q-pa-sm">
        <variant-selector></variant-selector>
      </div>
      <q-toolbar v-if="false" class="row q-gutter-xs full-width">
        <q-btn v-for="variant in VARIANTS" :key="variant" :label="variant"
          :color="settings.variant === variant ? 'primary' : 'secondary'" @click="settings.variant = variant"
          :flat="settings.variant === variant"></q-btn>
      </q-toolbar>


      <div class="row">
        <div v-for="(fairytale) in fairytales" :key="fairytale.id" class="col-sm-6 col-12 q-pa-sm">
          <q-card class="">
            <q-img :src="getImageSrc(fairytale.id)" alt="Main image" @click="viewVariants(fairytale.id)">
              <div class="absolute-bottom text-subtitle2 text-center">
                <!-- {{ index }}: {{ fairytale.title }} -->
                {{ fairytale.title }}
              </div>
            </q-img>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useSettingsStore, VARIANTS } from 'src/stores/settings';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import VariantSelector from 'src/components/VariantSelector.vue';

const fairytales = ref<{ id: string; title: string; mainImage: string; description: string }[]>([]);
const router = useRouter();
const settings = useSettingsStore();

//computed image src
function getImageSrc(id: string) {
  if (settings.variant === 'child-friendly') {
    return `/output/mainImages/${id}_child.png`;
  } else if (settings.variant === 'english') {
    return `/output/mainImages/${id}_english.png`;
  } else if (settings.variant === 'modern') {
    return `/output/mainImages/${id}_modern.png`;
  }
  return `/output/mainImages/${id}.png`;
}

onMounted(() => {
  loadFairytales();
});

const loadFairytales = async () => {
  const response = await fetch('/sections.json'); // Replace with actual metadata source
  let data = await response.json();
  console.log(data);
  //remove all that contains start: -1
  data = data.filter((item: any) => item.start !== -1);
  console.log(data);
  fairytales.value = data.map((item: any) => ({
    id: item.id,
    title: item.title,
    mainImage: `/output/mainImages/${item.id}.png`,
    description: item.description || 'A Norwegian fairytale',
  }));
  console.log(fairytales.value[0]);
};

const viewVariants = (id: string) => {
  //go to: story/:id
  router.push("/story/" + id);
};

const viewCharacters = (id: string) => {
  router.push({ name: 'characters', params: { id } });
};
</script>
