import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {NaiveUiResolver} from 'unplugin-vue-components/resolvers'

import path from 'path';

export default defineConfig({
    plugins: [
        vue(),
        AutoImport({
            imports: [
                'vue',
                {
                    'naive-ui': [
                        'useDialog',
                        'useMessage',
                        'useNotification',
                        'useLoadingBar'
                    ],
                    'vue-router': [
                        'useRouter',
                        'useRoute'
                    ]
                }
            ]
        }),
        Components({
            resolvers: [NaiveUiResolver()]
        })
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, './src'),
            "@app": path.resolve(__dirname, './src/app'),
            "@components": path.resolve(__dirname, './src/components'),
            "@pages": path.resolve(__dirname, './src/components/pages'),
            "@data": path.resolve(__dirname, './src/data'),
            "@shared": path.resolve(__dirname, './src/shared'),
        }
    }
})
