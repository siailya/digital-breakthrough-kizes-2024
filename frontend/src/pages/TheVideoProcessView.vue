<template>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <video :src="BACKEND + '/uploads/' + videoData?.id + '.mp4'" controls width="100%" class="rounded"/>
    </div>
    <div>
      <h2 class="text-3xl mb-3">Обработка видео #{{ videoData?.id.split('-')[0] }}</h2>
      <n-steps :current="currentStep as number">
        <n-step
            title="Загрузка"
        />
        <n-step
            title="Транскрипция"
        />
        <n-step
            title="Обработка"
        />
        <n-step
            title="Генерация"
        />
      </n-steps>

      <h3 class="text-xl mt-4 mb-2">Транскрипция видеоролика</h3>
      <n-input type="textarea" readonly rows="10" :value="videoData?.transcription.map(s => s.sentence).join('\n')"
               :loading="!videoData?.transcription"/>
    </div>

    <div>
      <n-spin :show="!videoData?.fullSummary">
        <h2 class="text-2xl mb-2">Описание ролика (саммари)</h2>
        <span>{{ videoData?.fullSummary || '&nbsp;' }}</span>
        <n-collapse class="mt-3">
          <n-collapse-item title="Саммари аудио">
            <span>{{ videoData?.summary || '&nbsp;' }}</span>
          </n-collapse-item>
          <n-collapse-item title="Саммари видео">
            <span>{{ videoData?.captioningSummaryRu || '&nbsp;' }}</span>
          </n-collapse-item>
        </n-collapse>
        <n-divider/>
      </n-spin>
    </div>

    <div>
      <h3 class="text-2xl mb-2">Рекомендуемое название</h3>
      <n-input :value="videoData?.generatedTitle" :loading="!videoData?.generatedTitle"/>

      <h3 class="text-2xl mt-3 mb-2">Рекомендуемое описание</h3>
      <n-input :value="videoData?.generatedDescription" :loading="!videoData?.generatedDescription"/>

      <h3 class="text-2xl mt-3 mb-2">Рекомендуемые хэштэги</h3>
      <n-input :value="videoData?.generatedTags" :loading="!videoData?.generatedTags"/>
    </div>
  </div>

  <h3 class="mt-5 mb-3 text-2xl">Сгенерированные ролики</h3>
  <div class="grid grid-cols-4 gap-3">
    <div v-for="clip in videoData?.clips" :key="clip">
      <video :src="BACKEND + '/uploads/' + clip" controls/>
    </div>
  </div>

</template>

<script setup lang="ts">
import {apiInstance} from "@app/api/apiInstance";
import {BACKEND} from "@app/config/apiConfig";
import {onUnmounted} from "vue";

const route = useRoute()

const videoData = ref<any | null>(null)
const uit = ref<any | null>(null)

const getVideoInfo = () => {
  apiInstance.get(`getProcessedVideo/${route.params.id}`).then((r) => {
    videoData.value = r.data as any
  })
}

const currentStep = computed(() => {
  return {
    'downloading': 1, 'whisper': 2, 'summarization': 3, 'generation': 4
  }[videoData.value?.status as 'downloading' | 'whisper' | 'summarization' | 'generation'] || 0
})

onMounted(() => {
  getVideoInfo()
  uit.value = setInterval(() => {
    getVideoInfo()
  }, 5000)
})

onUnmounted(() => {
  clearInterval(uit.value)
})
</script>


<style scoped>

</style>