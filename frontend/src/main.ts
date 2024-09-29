import {createApp} from 'vue'
import {router} from "@app/providers/router/router";
import {store} from "@app/providers/store/pinia";

import App from '@app/App.vue'
import '@app/style/index.css'

const meta = document.createElement('meta')
meta.name = 'naive-ui-style'
document.head.appendChild(meta)

createApp(App)
    .use(store)
    .use(router)
    .mount('#app')
