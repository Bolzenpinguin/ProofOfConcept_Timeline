import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import {faCaretDown, faCaretUp} from '@fortawesome/free-solid-svg-icons'

// Up & Down cause of the text transformation
library.add(faCaretDown, faCaretUp)

const app = createApp(App)

app.use(store);
app.use(router)

app
    .component('font-awesome-icon', FontAwesomeIcon)
    .mount('#app')
