import torch
import os
from typing import Annotated, Union, Optional, List
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from TTS.api import TTS

os.environ["COQUI_TOS_AGREED"] = "1"
DEFAULT_VOICE_PATH = 'example_voices/default.wav'

app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

device = "cuda" if torch.cuda.is_available() else "cpu"
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

async def save_example_voice(example_voice_path: str, voice_example: UploadFile) -> None:
    with open(example_voice_path, "wb") as audio_file:
        audio_file.write(voice_example.file.read())

@app.post('/predict_voice_example')
async def model_prediction(
    text: Annotated[str, File()],
    voice_example: Annotated[UploadFile, File()],
    ) -> FileResponse:
    result_path = f"results/output_{hash(text)}.wav"
    example_voice_path = f"example_voices/{voice_example.filename}"
    
    await save_example_voice(example_voice_path, voice_example)
    
    tts.tts_to_file(
                text=text,
                file_path=result_path,
                speaker_wav=example_voice_path,
                language="ru")
    return FileResponse(path=result_path, filename='output.wav', media_type='multipart/form-data')

@app.post('/predict_voice_default')
async def model_prediction(
    text: Annotated[str, File()]
    ) -> FileResponse:
    result_path = f"results/output_{hash(text)}.wav"
    
    tts.tts_to_file(
                text=text,
                file_path=result_path,
                speaker_wav=DEFAULT_VOICE_PATH,
                language="ru")
    return FileResponse(path=result_path, filename='output.wav', media_type='multipart/form-data')
    