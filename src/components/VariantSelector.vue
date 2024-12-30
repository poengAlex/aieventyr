<template>
  <q-card>

    <q-card-section hidden>
      <q-list>
        <q-item tag="label" v-ripple v-for="variant in VARIANTS" :key="variant">
          <q-item-section avatar>
            <q-radio v-model="settings.variant" :val="variant" color="teal" />
          </q-item-section>
          <q-item-section>
            <q-item-label>
              {{ VARIANT_TEXT[variant] }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
    <q-card-section>
      <div class="q-gutter-sm">
        <template v-for="variant in VARIANTS" :key="variant">
          <q-radio v-model="settings.variant" :val="variant" color="teal">
            {{ VARIANT_TEXT[variant] }}
          </q-radio>
        </template>
      </div>
    </q-card-section>
    <div class="q-px-md text-caption">
      {{ VARIANT_EXPLANATION[settings.variant] }}
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { useSettingsStore, VARIANTS, type VariantTypes, VARIANT_TEXT, VARIANT_EXPLANATION } from "src/stores/settings";
import { onMounted, ref } from "vue";

const settings = useSettingsStore();

onMounted(() => {
  console.log('onMounted - variant selector');
});
</script>

<style lang="scss" scoped></style>
