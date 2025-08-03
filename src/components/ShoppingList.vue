<script setup>
import { ref, nextTick, onMounted } from 'vue'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const newItem = ref('')
const form = ref(null)
// const items = ref(null)
const items = ref(null)
const error = ref(null)

async function fetchData() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/items`)
    items.value = await res.json()
    items.value = items.value.map(item => ({
      ...item,
      isDone: Boolean(item.isDone) // Convert 0/1 to false/true
    }))
  } catch (err) {
    console.error('Failed to fetch items', err)
  }
}

async function updateItemDone(item, newValue) {
  const prevState = item.isDone
  item.isDone = newValue

  try {
    const response = await fetch(`${apiBaseUrl}/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDone: Number(newValue) })
    })

    if (!response.ok) throw new Error("Update failed");

  } catch (err) {
    item.isDone = prevState; // Revert on error
    console.error("Update error:", err);
  }
}

async function addItem() {
  const { valid } = await form.value.validate()
  if (!valid) return

  try {
    const res = await fetch(`${apiBaseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.value })
    })
    if (!res.ok) throw new Error('Failed to add item')
    newItem.value = ''
    await fetchData()
    await nextTick()
    form.value.resetValidation()
  } catch (err) {
    // error.value = err.message
    console.error("Failed to add item:", err)
  }
}

async function removeItem(item) {
  try {
    const res = await fetch(`${apiBaseUrl}/api/items/${item.id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
    await fetchData();
    error.value = null

  } catch (err) {
    error.value = err.message
    console.error("Add error:", err)
  }
}
const rules = {
  required: value => !!value || 'Field is required'
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <v-app>
    <v-main>
      <v-container class="py-8">
        <v-card class="mx-auto" max-width="600" elevation="4">
          <v-alert v-if="error" type="error" closable @click:close="error = null">
            {{ error }}
          </v-alert>
          <v-card-title class="text-h4 text-center pa-6 bg-primary">
            Lista de compras
          </v-card-title>

          <v-card-text>
            <v-form ref="form" @submit.prevent="addItem">
              <v-text-field v-model="newItem" label="Nuevo artículo" :rules="[rules.required]" clearable></v-text-field>
              <v-btn type="submit" color="primary" block>Agregar</v-btn>
            </v-form>

            <v-list class="mt-4">
              <v-list-item v-for="item in items" :key="item.id">
                <template v-slot:prepend>
                  <v-checkbox-btn v-model="item.isDone"
                    @update:model-value="isDone => updateItemDone(item, isDone)"></v-checkbox-btn>
                </template>

                <v-list-item-title :class="{ 'text-decoration-line-through': item.isDone }">
                  {{ item.name }}
                </v-list-item-title>

                <template v-slot:append>
                  <v-btn icon="mdi-delete" variant="text" color="error" @click="removeItem(item)"></v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>