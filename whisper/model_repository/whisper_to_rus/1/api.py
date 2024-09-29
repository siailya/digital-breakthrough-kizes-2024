import torch
import numpy as np
from typing import Annotated
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import io
import soundfile as sf
from transformers import pipeline
from transformers import WhisperTokenizer, WhisperForConditionalGeneration, WhisperFeatureExtractor

app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = WhisperTokenizer.from_pretrained("openai/whisper-large-v2")
feature_extractor = WhisperFeatureExtractor.from_pretrained("openai/whisper-large-v2")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v2")
model = model.half()
model = model.to(device)

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    torch_dtype=torch.float16,
    feature_extractor=feature_extractor,
    tokenizer=tokenizer,
    chunk_length_s=30,
    stride_length_s=(4, 2),
    device=device,
    )
forced_decoder_ids = tokenizer.get_decoder_prompt_ids(language="russian", task="transcribe")

async def save_example_voice(example_voice_path: str, voice_example: UploadFile) -> None:
    with open(example_voice_path, "wb") as audio_file:
        audio_file.write(voice_example.file.read())

@app.post('/get_transcripton')
async def model_prediction(
    audio: Annotated[UploadFile, File()],
    ) -> JSONResponse:
    result = {}
    audio, samplerate = sf.read(io.BytesIO(await audio.read()))
    if len(audio.shape) != 1:
        audio = np.mean(audio, axis=-1)
    inputs = {
        "array": audio,
        "sampling_rate": samplerate
        }
    
    outputs = pipe(
        inputs.copy(),
        batch_size=8,
        return_timestamps=True)['chunks']
    if outputs[-1]['timestamp'] is None:
        outputs[-1]['timestamp'] = (outputs[-1]['timestamp'][0], len(audio) / samplerate)  # почему-то последний timecode это None
    texts = [i['text'] for i in outputs]
    timecodes = [i['timestamp'] for i in outputs]
    timecodes = np.array(timecodes).astype(np.float32).reshape((1, -1, 2))
    result["timestamps"] = timecodes.tolist()
    result["texts"] = texts
    result_json = jsonable_encoder(result)
    return JSONResponse(content=result_json)

