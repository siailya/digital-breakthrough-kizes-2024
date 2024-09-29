import * as fs from 'node:fs';
import * as path from 'node:path';
import * as URL from 'node:url';
import * as stream from 'node:stream';
import {promisify} from 'node:util';
// @ts-ignore
import * as m3u8Parser from 'm3u8-parser';
import sanitize from 'sanitize-filename';
import {spawn} from 'node:child_process';
import {mergeFiles} from "split-file";
import {v4 as uuidv4} from "uuid";

const regex_rutube = /^https?:\/\/rutube\.ru\/video\/(\w+)/;
const streamPipeline = promisify(stream.pipeline);

interface VideoInfo {
    title: string;
    thumbnail: string;
    duration: number;
}

// Создание директории
const createDir = (dir: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        fs.access(dir, (err) => {
            if (err && err.code === 'ENOENT') {
                fs.mkdirSync(dir, {recursive: true});
                resolve(true);
            } else {
                resolve(true);
            }
        });
    });
};

// Удаление файлов
const deleteFiles = async (reg: RegExp, dir: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        dir = path.normalize(dir) + "/";
        fs.readdirSync(dir).filter(f => reg.exec(f)).forEach(f => {
            fs.unlinkSync(dir + f);
        });
        resolve(true);
    });
};

// Удаление одного файла
const deleteFile = async (file: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        fs.stat(file, (err, stat) => {
            if (err == null) {
                fs.unlinkSync(file);
                resolve(true);
            } else if (err.code === 'ENOENT') {
                resolve(true);
            } else {
                reject(false);
            }
        });
    });
};

// Задержка
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Вызов FFmpeg
const execFFmpeg = async (input: string, output: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        let proc = spawn('ffmpeg', [
            '-hide_banner',
            '-y',
            '-i', input,
            '-vcodec', 'copy',
            '-acodec', 'copy',
            '-f', 'mp4', output
        ])

        proc.on('close', function () {
            resolve(true)
        });
    });
};

// Функция для получения информации о видео
export const getVideoInfo = async (_url: string): Promise<VideoInfo> => {
    return new Promise(async (resolve, reject) => {
        const m = regex_rutube.exec(_url);
        if (m !== null) {
            const apiUrl = `https://rutube.ru/api/play/options/${m[1]}/?no_404=true&referer=https%3A%2F%2Frutube.ru`;
            try {
                const response = await fetch(apiUrl);
                const json = await response.json();

                const videoInfo: VideoInfo = {
                    title: json.title,
                    thumbnail: json.thumbnail_url,
                    duration: json.duration
                };

                resolve(videoInfo);
            } catch (error) {
                reject(error);
            }
        } else {
            reject(new Error('Invalid URL format'));
        }
    });
};

// Функция для скачивания видео
export const downloadVideo = async (_url: string): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const m = regex_rutube.exec(_url);
        if (m !== null) {
            const uniqueName = uuidv4();

            const apiUrl = `https://rutube.ru/api/play/options/${m[1]}/?no_404=true&referer=https%3A%2F%2Frutube.ru`;
            try {
                const response = await fetch(apiUrl);
                const json = await response.json();
                const outputTitle = m[1];
                const video_m3u8 = json['video_balancer']['m3u8'];

                const m3u8Response = await fetch(video_m3u8);
                const m3u8Text = await m3u8Response.text();

                let parser = new m3u8Parser.Parser();
                parser.push(m3u8Text);
                parser.end();

                const parsedManifest = parser.manifest;
                const m3u8 = parsedManifest['playlists'][parsedManifest['playlists'].length - 1]['uri'];
                const myURL = URL.parse(m3u8);
                let pathname = myURL.pathname?.split("/");
                pathname?.pop();
                const urlPrefix = `${myURL.protocol}//${myURL.host}/${pathname?.join("/")}/`;

                const segmentResponse = await fetch(m3u8);
                const segmentText = await segmentResponse.text();

                await createDir(path.join(__dirname, "video"));
                await deleteFiles(/^segment-.*\.ts/, path.join(__dirname, 'video'));

                let m3u8Video = new m3u8Parser.Parser();
                m3u8Video.push(segmentText);
                m3u8Video.end();

                let segments = m3u8Video.manifest.segments;
                let ext = '';
                let arrFiles: string[] = [];

                for (let key in segments) {
                    ext = path.extname(segments[key]['uri']);
                    let int = parseInt(key) + 1;
                    let fname = uniqueName + '_segment-' + `${int}`.padStart(10, '0') + ext;
                    try {
                        let rs = await fetch(urlPrefix + segments[key]['uri']);
                        if (rs.ok) {
                            const f = path.join(__dirname, "video", fname);
                            arrFiles.push(f);
                            // @ts-ignore
                            await streamPipeline(rs.body, fs.createWriteStream(f));
                        } else {
                            reject(new Error("Проверьте подключение к интернету"));
                            return;
                        }
                    } catch (e) {
                        reject(new Error("Ошибка при скачивании сегмента"));
                        return;
                    }
                    await delay(50);
                }

                const saveTitle = sanitize(outputTitle);
                await mergeFiles(arrFiles, path.join(__dirname, 'video', `${saveTitle}${ext}`));
                await deleteFiles(/^segment-.*\.ts/, path.join(__dirname, 'video'));
                await deleteFile(path.join(__dirname, 'video', `${saveTitle}.mp4`));

                await execFFmpeg(path.join(__dirname, 'video', `${saveTitle}${ext}`), path.join(__dirname, '..', 'uploads', `${uniqueName}.mp4`));
                await deleteFile(path.join(__dirname, 'video', `${saveTitle}${ext}`));

                resolve(path.join(__dirname, 'video', `${saveTitle}.mp4`));
            } catch (error) {
                reject(error);
            }
        } else {
            reject(new Error('Invalid URL format'));
        }
    });
};