<script setup>
import { ref, nextTick, onMounted } from 'vue'
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''

const newItem = ref('')
const editingItemId = ref(null)  // Which item is being edited
const editingName = ref('')      // The new name being typed
const form = ref(null)
const items = ref(null)
const error = ref(null)

function startEdit(item) {
  editingItemId.value = item.id
  editingName.value = item.name  // Pre-fill with current name
}

function cancelEdit() {
  editingItemId.value = null
  editingName.value = ''
}

async function fetchData() {
  try {
    const res = await fetch(`${apiBaseUrl}/api/items`)
    items.value = await res.json()
  } catch (err) {
    console.error('Failed to fetch items', err)
  }
}

async function removeAllDoneItems() {
  const doneItems = items.value.filter(item => item.isDone)
  if (doneItems.length) {
    const originalItems = items.value

    // Optimisitc remove
    items.value = items.value.filter(item => !item.isDone)

    try {
      const response = await fetch(`${apiBaseUrl}/api/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: doneItems.map(item => item.id) })
      })
      if (!response.ok) throw new Error("Delete failed")
    } catch (err) {
      // Revert all changes on error

      items.value = originalItems
      console.error("Delete error:", err)
    }
  }
}

async function updateItem(item, updates) {
  // Store previous values for rollback
  const prevState = { ...item }

  // Apply updates optimistically
  Object.assign(item, updates)

  try {
    const response = await fetch(`${apiBaseUrl}/api/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error("Update failed")
  } catch (err) {
    // Revert all changes on error
    Object.assign(item, prevState)
    console.error("Update error:", err)
  }
}

async function saveEdit(item) {
  if (editingName.value.trim() && editingName.value !== item.name) {
    await updateItem(item, { name: editingName.value.trim() })
  }
  cancelEdit()
}

async function updateItemDone(item, newValue) {
  await updateItem(item, { isDone: Number(newValue) })
}

async function addItem() {
  const { valid } = await form.value.validate()
  if (!valid) return

  // Create temporary item for optimistic update
  const tempItem = {
    id: Date.now(), // Temporary ID (or use crypto.randomUUID())
    name: newItem.value,
    isDone: 0,
    // Add other default fields your items have
  }

  // Apply optimistically - add to list immediately
  items.value.push(tempItem)

  // Clear form immediately for better UX
  const itemName = newItem.value
  newItem.value = ''
  await nextTick()
  form.value.resetValidation()

  try {
    const res = await fetch(`${apiBaseUrl}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: itemName })
    })

    if (!res.ok) throw new Error('Failed to add item')

    const realItem = await res.json() // Get item with real ID from server

    // Replace temp item with real item (with proper ID)
    const tempIndex = items.value.findIndex(item => item.id === tempItem.id)
    if (tempIndex !== -1) {
      items.value[tempIndex] = realItem
    }

  } catch (err) {
    // Rollback: remove the temp item
    items.value = items.value.filter(item => item.id !== tempItem.id)

    // Restore form state
    newItem.value = itemName

    console.error("Failed to add item:", err)
  }
}

async function removeItem(item) {
  // Optimisitic remove
  const originalIndex = items.value.findIndex(i => i.id === item.id)
  items.value = items.value.filter(i => i.id !== item.id)
  try {
    const res = await fetch(`${apiBaseUrl}/api/items/${item.id}`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Delete failed');
    }
  } catch (err) {
    items.value.splice(originalIndex, 0, item)
    error.value = err.message
    console.error("Delete error:", err)
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
                  <v-checkbox-btn :model-value="item.isDone" :true-value="1" :false-value="0"
                    @update:model-value="isDone => updateItemDone(item, isDone)"></v-checkbox-btn>
                </template>
                <v-text-field v-if="editingItemId === item.id" v-model="editingName"
                  @keyup.enter="saveEdit(item, editingName)" @blur="saveEdit(item, editingName)" autofocus
                  density="compact"/>

                <v-list-item-title v-else :class="{ 'text-decoration-line-through': item.isDone }">
                  {{ item.name }}
                </v-list-item-title>

                <template v-slot:append>
                  <v-menu bottom left>
                    <template v-slot:activator="{ props }">
                      <v-btn icon v-bind="props" flat density="comfortable">
                        <v-icon>mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="startEdit(item)">
                        <v-list-item-icon>
                          <v-icon>mdi-pencil</v-icon>
                        </v-list-item-icon>
                      </v-list-item>

                      <v-list-item @click="removeItem(item)">
                        <v-list-item-icon>
                          <v-icon  color="error">mdi-delete</v-icon>
                        </v-list-item-icon>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </template>
              </v-list-item>
            </v-list>

            <v-btn @click="removeAllDoneItems" color="error" block>Borrar todos marcados</v-btn>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>