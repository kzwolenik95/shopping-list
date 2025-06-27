<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { ref } from 'vue'

const name = ref('Unknown')

const getName = async () => {
  const res = await fetch('/api/')
  const data = await res.json()
  name.value = data.name
  console.log("name")
}
</script>

<template>
  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
