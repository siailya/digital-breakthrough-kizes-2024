<template>
  <div class="mt-28 mb-40 text-5xl text-center font-bold">
    Генерация <span class="text-red-600 font-black">виральных</span> видео
  </div>

<!--  <div class="flex flex-col gap-2">-->
<!--    <n-input size="large" placeholder="URL на видео с RuTube" v-model:value="videoUrl"/>-->
<!--    <n-collapse-transition :show="!!videoUrlError">-->
<!--      {{ videoUrlError }}-->
<!--    </n-collapse-transition>-->
<!--  </div class="flex flex-colgap-2">-->

<!--  <div class="w-full text-center my-2 opacity-60">- или -</div>-->

  <transition name="fade" mode="out-in">
    <div v-if="videoUrl && !videoUrlError">
      <h2 class="text-3xl mb-4 inline-block">{{ videoData?.title }}</h2>
      <n-image :src="videoData?.thumbnail" class="block rounded" width="25%"/>

      <div class="mt-5 flex justify-center">
        <n-button size="large" type="primary" class="mx-auto text-5xl" @click="onClickProcessRutubeVideo">
          Обработать
        </n-button>
      </div>
    </div>
    <div v-else>
      <n-upload
          response-type="json"
          :action="BACKEND + '/uploadVideo'"
          :max="1"
          accept="video/mp4,video/avi"
          @finish="onVideoUploaded"
      >
        <n-upload-dragger>
          <div style="margin-bottom: 12px">
            <n-icon size="48" :depth="3">
              <MaterialSymbolsVideoCallOutline/>
            </n-icon>
          </div>
          <n-text class="text-2xl font-medium">
            Нажмите или перетащите видео сюда
          </n-text>
          <n-p depth="3" class="mt-3">
            Принимаются файлы в формате .mp4 и .avi, до 100Мб
          </n-p>
        </n-upload-dragger>
      </n-upload>
    </div>
  </transition>
</template>

<script lang="ts" setup>
import MaterialSymbolsVideoCallOutline from "@shared/ui/icons/MaterialSymbolsVideoCallOutline.vue";
import {BACKEND} from "@app/config/apiConfig";
import {apiInstance} from "@app/api/apiInstance";
import {useRouter} from "vue-router";

const router = useRouter();

const videoUrl = ref('');
const videoUrlError = ref('');
const videoData = ref<any>({})

const validateRutubeUrl = (url: string): string | null => {
  if (!url) return null;

  // Регулярное выражение для проверки правильного формата URL
  const rutubeUrlPattern = /^https:\/\/rutube\.ru\/video\/[a-zA-Z0-9]*\/?$/;
  try {
    const parsedUrl = new URL(url);

    // Проверяем, что это rutube.ru и формат /video/VIDEO_ID
    if (parsedUrl.host !== 'rutube.ru') {
      return 'Хост должен быть rutube.ru';
    }
    if (!rutubeUrlPattern.test(url)) {
      return 'URL должен быть вида https://rutube.ru/video/VIDEO_ID';
    }
  } catch (e) {
    return 'Некорректный URL';
  }

  return null;
};

watch(videoUrl, async (val: string) => {
  videoUrlError.value = validateRutubeUrl(val) || '';

  if (!videoUrlError.value) {
    getRutubeVideoInfo(videoUrl.value)
        .then(r => videoData.value = r.data)
        .catch(e => videoUrlError.value = e.response.data);
  }
});

const getRutubeVideoInfo = async (videoUrl: string) => {
  return await apiInstance.post('/getRutubeVideoInfo', {
    rutubeUrl: videoUrl,
  })
}

const onClickProcessRutubeVideo = () => {
  apiInstance.post('processRutubeVideo', {
    videoUrl: videoUrl.value,
  }).then(r => {
    router.push(`/video-process/${r.data.id}`)
  })
}

const onVideoUploaded = (e: any) => {
  apiInstance.post('processPlainVideo', {
    id: e.event.target.response.id
  }).then(() => {
    router.push(`/video-process/${e.event.target.response.id}`)
  })
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>