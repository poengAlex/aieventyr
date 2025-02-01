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
        <!-- <q-item>
          <q-toggle v-model="settings.legacy" label="Bruk første version av historier og bilder"
            @update:model-value="reloadPage" />
        </q-item> -->
        <q-item>
          Version av tekst og bilder:
        </q-item>
        <q-item>
          <q-item-section>
            <q-radio v-model="settings.version" val="1" label="Version 1" @update:model-value="reloadPage" />
            <q-radio v-model="settings.version" val="2" label="Version 2" @update:model-value="reloadPage" />
            <q-radio v-model="settings.version" val="3" label="Version 3" @update:model-value="reloadPage" />
          </q-item-section>

        </q-item>
        <q-item>
          <q-item-section side>
            <q-badge color="primary">
              {{ VERSION_TEXT[settings.version] }}
            </q-badge>
          </q-item-section>
        </q-item>
        <q-separator />
        <q-item>
          <q-badge color="primary">
            Fontstørrelse: {{ settings.fontSize }}
          </q-badge>
        </q-item>
        <q-item>

          <q-slider v-model="settings.fontSize" :min="12" :max="30" :step="2" />
        </q-item>
        <q-list class="text-center">
          <q-btn @click="settings.resetMarkAsRead()" label="Reset markert som lest" color="primary" />
          <q-btn class="q-mt-xl" @click="resetApp()" label="Reset app" color="negative" icon="delete" />
        </q-list>
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
import { useSettingsStore, VARIANTS, VERSION_TEXT } from 'src/stores/settings';

const settings = useSettingsStore();


function resetApp() {
  localStorage.clear();
  window.location.reload();
}

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
    title: 'Bilder',
    caption: 'En liste med alle bildene som er generert i prosjektet',
    icon: 'image',
    link: '/images'
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
