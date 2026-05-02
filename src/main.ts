import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { i18n } from './i18n'
import './assets/globals.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia).use(router).use(i18n)

// Initialize stores before mount so there's no flash / missing locale
import { useThemeStore } from './stores/theme'
import { useLocaleStore } from './stores/locale'
useThemeStore(pinia)
useLocaleStore(pinia)

app.mount('#app')
