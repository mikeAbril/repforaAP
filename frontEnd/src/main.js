import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog } from 'quasar'
import router from './routes/routes'
import quasarIconSet from 'quasar/icon-set/material-symbols-outlined'
import '@quasar/extras/material-symbols-outlined/material-symbols-outlined.css'
import 'quasar/src/css/index.sass'

import App from './App.vue'

import './style.css' // Optional global overrides

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.use(Quasar, {
    plugins: {
        Notify,
        Dialog
    }, // import Quasar plugins and add here
    iconSet: quasarIconSet
})

app.mount('#app')
