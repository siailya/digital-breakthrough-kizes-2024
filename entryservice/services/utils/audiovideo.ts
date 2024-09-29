import {spawn} from "node:child_process";
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';
import path from "node:path";
import {ensureDirectoryExists, removeDirectory} from "./filesystem";
import {IMAGE_CAPT_BACKEND} from "../config";
import {ffprobe} from "fluent-ffmpeg";


export function extractAudioFromVideo(videoPath: string, audioOutputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const p = spawn(`ffmpeg`, [`-i`, `${videoPath}`, `-vn`, `${audioOutputPath.endsWith('.wav') ? audioOutputPath : audioOutputPath + '.wav'}`])

        p.on('close', () => {
            resolve(audioOutputPath)
        })
    });
}

export async function generateKeyframesFromVideo(videoPath: string, framesPerSecond: number = 0.5): Promise<string> {
    return new Promise(async (resolve) => {
        const videoId = videoPath.split('\\')[videoPath.split('\\').length - 1].split('.')[0]

        await ensureDirectoryExists(path.join(__dirname, '..', '..', 'uploads', `images-${videoId}`))

        const p = spawn(`ffmpeg`, [`-i`, `${videoPath}`, `-r`, framesPerSecond.toString(), path.join(__dirname, '..', '..', 'uploads', `images-${videoId}/img-%05d.png`)])

        p.on('close', () => {
            resolve(path.join(__dirname, '..', '..', 'uploads', `images-${videoId}`))
        })
    })
}

// Функция для отправки изображений на сервер для получения описаний
export async function imageCapRequest(imagePaths: string[], bs = 100): Promise<string[]> {
    const headers = {
        'accept': 'application/json',
    };

    const results = [];

    for (let i = 0; i < imagePaths.length; i += bs) {
        console.log(`Image captioning process ${i}/${imagePaths.length}`);
        const batch = imagePaths.slice(i, i + bs);

        const formData = new FormData();
        batch.forEach((sample) => {
            formData.append('byte_images', fs.createReadStream(sample), {filename: sample, contentType: 'image/png'});
        });

        const response = await fetch(IMAGE_CAPT_BACKEND + '/send_caption_of_images', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
            },
            body: formData,
        });

        const jsonResponse = await response.json();
        results.push(...jsonResponse);
    }

    if (imagePaths[0]) {
        await removeDirectory(imagePaths[0].split('\\').slice(0, -1).join('\\'));
    }

    return [...new Set(results)];
}


export async function getMediaDuration(mediaPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffprobe(mediaPath, (err, data) => {
            resolve(data.format.duration!)
        })
    })
}

export async function runFfmpeg(args: string[]): Promise<any> {
    new Promise((resolve) => {
        const p = spawn('ffmpeg', args, {shell: true})

        p.on('exit', () => {
            resolve(true)
        })
    })
}

export function replaceAudio(videoPath: string, audioPath: string, outVideoPath: string): Promise<boolean> {
    return new Promise((resolve) => {
        runFfmpeg([`-i ${videoPath} -i ${audioPath} -c:v copy -map 0:v:0 -map 1:a:0 ${outVideoPath}`])
            .then(resolve);
    })
}

export async function makeVerticalWithBlur(videoPath: string, outVideoPath: string) {
    return new Promise((resolve) => {
        runFfmpeg([`-i ${videoPath} -lavfi "[0:v]scale=16/9*iw:16/9*ih,boxblur=luma_radius=min(h\\,w)/20:luma_power=3:chroma_radius=min(cw\\,ch)/40:chroma_power=1[bg];[bg][0:v]overlay=(W-w)/2:(H-h)/2,setsar=1,crop=w=iw*9/16" -c:a copy ${outVideoPath}`])
            .then(resolve)
    })
}