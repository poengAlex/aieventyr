<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-dark">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title @click="$router.push('/')" style="cursor: pointer;">
          Norske Folkeeventyr
        </q-toolbar-title>

        <div>
          <q-select style="width: 120px;" v-model="settings.variant" :options="VARIANTS" />
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" bordered>
      <q-list>
        <q-item-label header>
          Norske Folke-eventyr
          <div class="text-caption">
            Fortalte af P. Chr. Asbjørnsen og Jørgen Moe
          </div>
          <div class="text-caption">
            SYVENDE UDGAVE REVIDERET VED MOLTKE MOE
          </div>
        </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
        <q-separator />
        <q-item>
          <q-toggle v-model="settings.legacy" label="Bruk første version av historier og bilder"
            @update:model-value="reloadPage" />
        </q-item>
        <q-item>
          <q-badge color="primary">
            Fontstørrelse: {{ settings.fontSize }}
          </q-badge>
        </q-item>
        <q-item>

          <q-slider v-model="settings.fontSize" :min="12" :max="30" :step="2" />
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container class="bg-white">
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { useSettingsStore, VARIANTS } from 'src/stores/settings';

const settings = useSettingsStore();

function reloadPage() {
  window.location.reload();
}

const linksList: EssentialLinkProps[] = [
  {
    title: 'Hjem',
    caption: 'Oversikt over alle eventyrene',
    icon: 'home',
    link: '/'
  },
  {
    title: 'Om prosjektet',
    caption: '',
    icon: 'info',
    link: '/about'
  },
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>
