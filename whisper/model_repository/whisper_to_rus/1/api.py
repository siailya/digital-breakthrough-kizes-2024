import torch
import numpy as np
from typing import Annotated
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import io
import soundfile as sf
from transformers import pipeline, WhisperTokenizer, WhisperForConditionalGeneration, WhisperFeatureExtractor

# Initialize FastAPI application
app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

# Determine the device to use for inference
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load the Whisper model, tokenizer, and feature extractor
tokenizer = WhisperTokenizer.from_pretrained("openai/whisper-large-v2")
feature_extractor = WhisperFeatureExtractor.from_pretrained("openai/whisper-large-v2")
model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v2")
model = model.half()
model = model.to(device)

# Initialize the ASR pipeline
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
    """
    Save the provided voice example to a specified file path.

    Args:
        example_voice_path (str): The path where the voice example will be saved.
        voice_example (UploadFile): The uploaded voice example file.
    """
    with open(example_voice_path, "wb") as audio_file:
        audio_file.write(voice_example.file.read())

@app.post('/get_transcripton')
async def model_prediction(
    audio: Annotated[UploadFile, File()],
    ) -> JSONResponse:
    """
    Generate a transcription from the provided audio file.

    Args:
        audio (UploadFile): The audio file to be transcribed.

    Returns:
        JSONResponse: A JSON response containing the transcription and timestamps.
    """
    result = {}

    # Read audio file
    audio, samplerate = sf.read(io.BytesIO(await audio.read()))
    
    # Convert stereo to mono if necessary
    if len(audio.shape) != 1:
        audio = np.mean(audio, axis=-1)
    
    inputs = {
        "array": audio,
        "sampling_rate": samplerate
    }
    
    # Transcribe audio using the ASR pipeline
    outputs = pipe(
        inputs.copy(),
        batch_size=8,
        return_timestamps=True
    )['chunks']
    
    # Handle the case where the last timestamp is None
    if outputs[-1]['timestamp'] is None:
        outputs[-1]['timestamp'] = (outputs[-1]['timestamp'][0], len(audio) / samplerate)
    
    texts = [i['text'] for i in outputs]
    timecodes = [i['timestamp'] for i in outputs]
    timecodes = np.array(timecodes).astype(np.float32).reshape((1, -1, 2))
    
    # Prepare the result
    result["timestamps"] = timecodes.tolist()
    result["texts"] = texts
    
    # Encode the result to JSON
    result_json = jsonable_encoder(result)
    
    # Return the result as a JSON response
    return JSONResponse(content=result_json)
