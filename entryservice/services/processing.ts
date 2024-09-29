import fs from "node:fs";
import path from "node:path";
import {
    extractAudioFromVideo,
    generateKeyframesFromVideo,
    getMediaDuration,
    imageCapRequest,
    makeVerticalWithBlur,
    replaceAudio,
    runFfmpeg
} from "./utils/audiovideo";
import FormData from "form-data";
import fetch from 'node-fetch';
import {VideoTask} from "./queue";
import {ASR_BACKEND} from "./config";
import {getFilesInDirectory} from "./utils/filesystem";
import {requestLlm} from "./llm";
import {getCloseMatches} from "difflib";
import {mergeSubtitles} from "./utils";
import {requestTTS} from "./tts";
import {promises as fsp} from 'fs'
import ffmpeg from "fluent-ffmpeg";

export class ProcessingQueue {
    isRunning = false;
    queue: string[] = []

    async startProcessing(videoId: string) {
        if (this.isRunning) {
            this.queue.push(videoId)
            return
        }

        this.isRunning = true;

        const vt = await VideoTask.findOne({id: videoId})

        if (!vt) return Promise.reject(new Error("Video not found."));

        Promise.all([
            this.asrVideo(path.join(__dirname, '..', 'uploads', videoId + '.mp4')),
            this.captionVideo(path.join(__dirname, '..', 'uploads', videoId + '.mp4'))
        ])
            .then(async (res) => {
                console.log('Generate summary')

                vt.captioning = res[1]
                vt.status = 'summarization'
                await vt.save()

                if (res[0]) {
                    vt.transcription = res[0]?.timestamps?.[0]?.map((t: any, i: number) => {
                        return {
                            sentence: res[0].texts[i],
                            start: t[0],
                            end: t[1]
                        }
                    })
                }


                if (!res[0]?.timestamps || (vt.transcription.length / (vt.transcription.at(-1)?.start || 0.0001) < 0.05)) {
                    console.log('Video without text')
                    await this.summaryCaptioning(videoId)
                    vt.summary = ''
                    await vt.save()

                    console.log('Generate TTS')
                    await requestTTS((await VideoTask.findOne({id: videoId}))!.captioningSummaryRu!, path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'));

                    const ttsDuration = await getMediaDuration(path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'))
                    const videoDuration = await getMediaDuration(path.join(__dirname, '..', 'uploads', videoId + '.mp4'))

                    console.log("Splitting for tts clips")
                    runFfmpeg([...`-ss 20 -i ${path.join(__dirname, '..', 'uploads', videoId + '.mp4')} -c copy -t ${ttsDuration} ${path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p1.mp4')}`.split(' ')])
                        .then(() => runFfmpeg([`-ss ${videoDuration / 2 - ttsDuration / 2} -i ${path.join(__dirname, '..', 'uploads', videoId + '.mp4')} -c copy -t ${ttsDuration} ${path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p2.mp4')}`]))
                        .then(() => runFfmpeg([`-ss ${videoDuration - ttsDuration - 20} -i ${path.join(__dirname, '..', 'uploads', videoId + '.mp4')} -c copy -t ${ttsDuration} ${path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p3.mp4')}`]))

                    setTimeout(() => {
                        replaceAudio(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p1.mp4'), path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'), path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p1.mp4'))
                        replaceAudio(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p2.mp4'), path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'), path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p2.mp4'))
                        replaceAudio(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p3.mp4'), path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'), path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p3.mp4'))

                        setTimeout(async () => {
                            try {
                                await fsp.rm(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p1.mp4'))
                                await fsp.rm(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p2.mp4'))
                                await fsp.rm(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p3.mp4'))
                                await fsp.rm(path.join(__dirname, '..', 'uploads', videoId + '_tts.wav'))
                            } catch (e: any) {
                                console.error(e)
                            }

                            await makeVerticalWithBlur(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p1.mp4'), path.join(__dirname, '..', 'uploads', 'finalclip_' + videoId + '_p1.mp4'))
                            await makeVerticalWithBlur(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p2.mp4'), path.join(__dirname, '..', 'uploads', 'finalclip_' + videoId + '_p2.mp4'))
                            await makeVerticalWithBlur(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p3.mp4'), path.join(__dirname, '..', 'uploads', 'finalclip_' + videoId + '_p3.mp4'))

                            setTimeout(async () => {
                                try {
                                    await fsp.rm(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p1.mp4'))
                                    await fsp.rm(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p2.mp4'))
                                    await fsp.rm(path.join(__dirname, '..', 'uploads', 'newclip_' + videoId + '_p3.mp4'))
                                } catch (e: any) {
                                    console.error(e)
                                }

                                vt.clips = ['finalclip_' + videoId + '_p1.mp4', 'finalclip_' + videoId + '_p2.mp4', 'finalclip_' + videoId + '_p3.mp4']
                                await vt.save()
                            }, 20000)

                        }, 20000)

                    }, 10000)
                } else {
                    vt.transcription = res[0].timestamps[0].map((t: any, i: number) => {
                        return {
                            sentence: res[0].texts[i],
                            start: t[0],
                            end: t[1]
                        }
                    })
                    await vt.save()

                    console.log('Generate summaryCaptioning and summaryText')
                    await Promise.all([this.summaryCaptioning(videoId), this.summaryText(videoId)])

                    console.log('Generate highlights')
                    const uvt = await this.createHighlights(videoId)
                    uvt!.clips = []

                    for (const h of uvt!.highlights) {
                        const o = (await cutHighlight(videoId, uvt!.highlights.indexOf(h), h))!
                        await makeVerticalWithBlur(o, path.join(__dirname, '..', 'uploads', 'finalclip_' + videoId + '_p' + uvt!.highlights.indexOf(h) + '.mp4'))

                        uvt!.clips.push('finalclip_' + videoId + '_p' + uvt!.highlights.indexOf(h) + '.mp4')

                        setTimeout(async () => {
                            try {
                                await fsp.rm(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p' + uvt!.highlights.indexOf(h) + '.mp4'))
                            } catch (e: any) {
                                console.error(e)
                            }
                        }, 120_000)
                    }

                    await uvt!.save()

                }

                console.log('Generate complete summary')
                await this.createCompleteSummary(videoId)

                console.log("Generate title, description and tags")
                await Promise.all([this.generateTitle(videoId), this.generateDescription(videoId), this.generateTags(videoId)])

                this.isRunning = false

                if (this.queue.length > 0) {
                    this.startProcessing(this.queue.shift() as string)
                }
            })
    }

    async asrRequest(pathToAudio: string) {
        const audioStream = fs.createReadStream(pathToAudio);
        const formData = new FormData();

        formData.append('audio', audioStream, {filename: 'audio.wav'});
        formData.append('type', 'audio/wav');

        const response = await fetch(ASR_BACKEND + '/get_transcripton', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
            },
            body: formData,
        });

        return response.json();
    }

    async asrVideo(videoPath: string) {
        const audioOutputPath = path.join(__dirname, '..', 'uploads', videoPath.split('\\')[videoPath.split('\\').length - 1].split('.')[0] + '.wav');

        try {
            // Извлечение аудио
            const extractedAudioPath = await extractAudioFromVideo(videoPath, audioOutputPath);

            // Отправка аудио в ASR
            const transcription = await this.asrRequest(extractedAudioPath);

            // Удаление временного аудиофайла после обработки
            fs.unlinkSync(extractedAudioPath);

            return transcription;
        } catch (error) {
            console.error('Ошибка при обработке видео:', error);
        }
    }

    async captionVideo(videoPath: string) {
        return await imageCapRequest(await getFilesInDirectory(await generateKeyframesFromVideo(videoPath)))
    }

    async summaryText(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        vt!.summary = await requestLlm('Write a summary of the video on YouTube: ' + vt!.transcription.map(s => s.sentence).join('').split(/(?<=\.)|(?<=\?)|(?<=\!)/))
        await vt!.save()
    }

    async summaryCaptioning(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        vt!.captioningSummary = await requestLlm('I have few descriptions every 2 seconds frames from video. Write a short descriprtion (two of three sentences) of the video. The result should be a text of few sentences, which can then be used for a background audio track. Answer in JSON-format, for example: \\n {\\"video\\": \\"short video description\\"}. Do not write \\"Here is a short description of the video in two or three sentences\\" or something like that.' + vt!.captioning.join('\n'))
        vt!.captioningSummaryRu = (await requestLlm('Переведи на русский: ' + vt!.captioningSummary)).replace(/youtube/ig, 'RuTube')
        await vt!.save()
    }

    async createCompleteSummary(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        vt!.fullSummary = await requestLlm(`Напиши описание видео по саммари его адуиодорожки и описанию видеоряда, напиши о чем это видео в целом, не разделяя его на составляющие. Саммари аудио: ${vt!.summary}; Саммари видео: ${vt!.captioningSummaryRu}`)
        await vt!.save()
    }

    async createHighlights(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})

        let prompt = `Hi, please help me find the most interesting and viral moments in this video. I have a transcription of the video. Write the answer in the form of a list of paragraphs consisting of the original phrases. Keep in mind that then I use this information to cut out parts of the video and post them on sites such as YouTube and TikTok. Therefore, it is very important that the paragraphs are not too short (more than two sentences), and the videos with them are interesting and fun to watch for as many people as possible. Each received paragraph should be whole and separate so that its meaning is clear without context.
Video description info: {video_desc}
Summary of video: {summary_video}
Transcription of video: {transcript_video}

Answer in JSON-format, for example:
{
    "highlights":
    [
        {
            "transcription": "Несколько предложений из транскрипции самого вирального момента."
        }
    ]
}

DO NOT WRITE META INFORMATION LIKE "HERE IS YOUR ANSWER" OR "BASED ON YOUR INFORMATION", PROVIDE ONLY JSON IN THE RESPONSE. ПИШИ ТРАНСКРИПЦИИ ТОЛЬКО НА РУССКОМ!`

        prompt = prompt.replace('{video_desc}', vt!.captioningSummary as string)
        prompt = prompt.replace('{summary_video}', vt!.summary as string)
        prompt = prompt.replace('{transcript_video}', vt!.transcription.map(s => s.sentence).join('\n') as string)

        const llmRes = await requestLlm(prompt)
        const res = JSON.parse(llmRes)
        const sentences = vt!.transcription.map(s => s.sentence)


        vt!.highlights = res.highlights.map((h: any) => {
            const matches = getCloseMatches(h.transcription, sentences, 10, 0.2)

            const subs = matches.map(s => {
                return vt!.transcription.find(t => s === t.sentence)
            }).sort((a: any, b: any) => a.start - b.start).map((s: any) => JSON.parse(JSON.stringify(s)))

            if (!subs.length) return null

            return mergeSubtitles(subs)
        }).filter((h: any) => !!h)

        return await vt!.save()
    }

    async generateTitle(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        let prompt = `Сгенерируй заголовок для видео, на основе краткого содержания: {summary} и описания видео: {img_cap_summary}. Отвечай в JSON-формате, например:
{
    "title": "Текст заголовка"
}`
        prompt = prompt.replace('{summary}', vt!.summary!)
        prompt = prompt.replace('{img_cap_summary}', vt!.captioningSummary!)

        vt!.generatedTitle = await requestLlm(prompt)
        await vt!.save()
    }

    async generateDescription(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        let prompt = `Сгенерируй небольшое описание видео, на основе краткого содержания: {summary} и описания видео: {img_cap_summary}. Отвечай в JSON-формате, например:
{
    "description": "Краткое описание видео"
}`
        prompt = prompt.replace('{summary}', vt!.summary!)
        prompt = prompt.replace('{img_cap_summary}', vt!.captioningSummary!)

        vt!.generatedDescription = await requestLlm(prompt)
        await vt!.save()
    }

    async generateTags(videoId: string) {
        const vt = await VideoTask.findOne({id: videoId})
        let prompt = `Generate list of ten hashtags for video, using summary: {summary} and video description: {img_cap_summary}. Answer in JSON-format, for example:
{
    "hashtags": [
        "#hashtag_one",
        "#hashtag_two",
        "#hashtag_three"
    ]
}`
        prompt = prompt.replace('{summary}', vt!.summary!)
        prompt = prompt.replace('{img_cap_summary}', vt!.captioningSummary!)

        vt!.generatedTags = await requestLlm(prompt)
        await vt!.save()
    }
}

const cutHighlight = async (videoId: string, index: number, h: any): Promise<string> => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(path.join(__dirname, '..', 'uploads', videoId + '.mp4'))
            .seek(h.start)
            .setDuration(h.end - h.start)
            .output(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p' + index + '.mp4'))
            .on('end', () => {
                resolve(path.join(__dirname, '..', 'uploads', 'clip_' + videoId + '_p' + index + '.mp4'))
            })
            .run()
    })
}

// (async () => {
//     await mongoose.connect('mongodb://root:example@127.0.0.1:27017/clipvibe?authSource=admin');
//
//     const videoId = '2e8c8264-b952-4a19-8651-49feabe6b8b9'
//     const uvt = await VideoTask.findOne({id: videoId})!
//
// })()