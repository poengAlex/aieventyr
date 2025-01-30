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
            <q-img :src="getImageSrc(fairytale.id, fairytale.index)" alt="Main image"
              @click="viewVariants(fairytale.id)">
              <div class="absolute-bottom text-subtitle2 text-center">
                <!-- {{ index }}: {{ fairytale.title }} -->
                {{ getTitle(fairytale) }}
                <template v-if="false">
                  - {{ fairytale.index }}
                </template>
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
import { createNotify } from 'src/logic/utils';

const fairytales = ref<{ id: string; title: string; titleCleaned: string; titleEnglish: string; mainImage: string; description: string; index: number }[]>([]);
const router = useRouter();
const settings = useSettingsStore();

//computed image src
function getImageSrc(id: string, index: number) {
  if (settings.legacy) {
    if (settings.variant === 'child-friendly') {
      return `/output/mainImages/${id}_child.png`;
    } else if (settings.variant === 'english') {
      return `/output/mainImages/${id}_english.png`;
    } else if (settings.variant === 'modern') {
      return `/output/mainImages/${id}_modern.png`;
    }
    return `/output/mainImages/${id}.png`;
  } else {
    //Ex: /new/images/main/cleaned/tale1.png
    let variant = settings.variant as string;
    if (settings.variant === 'child-friendly') {
      variant = 'child';
    } else if (settings.variant === 'raw') {
      variant = 'cleaned';
    }

    const path = `/new/images/main/${variant}/tale${index}.png`;
    // console.log(id, index, path);
    return path;
  }

}

function getTitle(fairytale: any) {
  if (settings.legacy) {
    return fairytale.title;
  } else {
    if (settings.variant === 'child-friendly') {
      return fairytale.titleCleaned;
    } else if (settings.variant === 'english') {
      return fairytale.titleEnglish;
    } else if (settings.variant === 'simplified') {
      return fairytale.titleCleaned;
    } else if (settings.variant === 'modern') {
      return fairytale.titleCleaned;
    } else {
      return fairytale.title;
    }
  }

}

onMounted(() => {
  loadFairytales();
});

const loadFairytales = async () => {
  try {
    let response;
    if (settings.legacy) {
      response = await fetch('/sections.json'); // Replace with actual metadata source
    } else {
      response = await fetch('/sections_v3.json');
    }

    let data = await response.json();
    console.log(data);
    console.log(data[0]);
    //remove all that contains start: -1
    data = data.filter((item: any) => item.start !== -1);
    console.log(data);
    fairytales.value = data.map((item: any) => ({
      id: item.id,
      title: item.title,
      index: item.index,
      titleCleaned: item.title_cleaned,
      titleEnglish: item.title_modern,
      mainImage: `/output/mainImages/${item.id}.png`,
      description: item.description || 'A Norwegian fairytale',
    }));
    console.log(fairytales.value[0]);

  } catch (err: unknown) {
    console.error(err);
    createNotify((err as Error).message, "Klarte ikke å laste eventyr");
  }

};

const viewVariants = (id: string) => {
  //go to: story/:id
  router.push("/story/" + id);
};

const viewCharacters = (id: string) => {
  router.push({ name: 'characters', params: { id } });
};
</script>
