import fs from "fs";
import {TTS_BACKEND} from "./config";

export async function requestTTS(textToSpeech: string, outputPath: string) {
    try {
        const response = await fetch(TTS_BACKEND + '/predict_voice_default', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'text': textToSpeech
            })
        });

        const audioBuffer = await response.arrayBuffer();

        fs.writeFile(outputPath, Buffer.from(audioBuffer), (err) => {
            if (err) throw err;
        });
    } catch (error: any) {
        console.error(`Ошибка: ${error.message}`);
    }
}