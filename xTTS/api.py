import torch
import os
from typing import Annotated, Union, Optional, List
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from TTS.api import TTS

os.environ["COQUI_TOS_AGREED"] = "1"

# Path to the default voice file
DEFAULT_VOICE_PATH = 'example_voices/default.wav'

# Initialize FastAPI application
app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

# Determine the device to use for inference
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize the TTS model and move it to the appropriate device
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

async def save_example_voice(example_voice_path: str, voice_example: UploadFile) -> None:
    """
    Save the provided voice example to a specified file path.

    Args:
        example_voice_path (str): The path where the voice example will be saved.
        voice_example (UploadFile): The uploaded voice example file.
    """
    with open(example_voice_path, "wb") as audio_file:
        audio_file.write(voice_example.file.read())

@app.post('/predict_voice_example')
async def model_prediction(
    text: Annotated[str, File()],
    voice_example: Annotated[UploadFile, File()],
    ) -> FileResponse:
    """
    Generate a speech audio file from the provided text and voice example.

    Args:
        text (str): The text data to be converted into speech.
        voice_example (UploadFile): The custom voice example file.

    Returns:
        FileResponse: The generated speech audio file.
    """
    result_path = f"results/output_{hash(text)}.wav"
    example_voice_path = f"example_voices/{voice_example.filename}"
    
    # Save the provided voice example
    await save_example_voice(example_voice_path, voice_example)
    
    # Generate the speech audio file using the provided text and voice example
    tts.tts_to_file(
                text=text,
                file_path=result_path,
                speaker_wav=example_voice_path,
                language="ru")
    
    # Return the generated audio file as response
    return FileResponse(path=result_path, filename='output.wav', media_type='multipart/form-data')

@app.post('/predict_voice_default')
async def model_prediction(
    text: Annotated[str, File()]
    ) -> FileResponse:
    """
    Generate a speech audio file from the provided text using the default voice.

    Args:
        text (str): The text data to be converted into speech.

    Returns:
        FileResponse: The generated speech audio file.
    """
    result_path = f"results/output_{hash(text)}.wav"
    
    # Generate the speech audio file using the provided text and default voice
    tts.tts_to_file(
                text=text,
                file_path=result_path,
                speaker_wav=DEFAULT_VOICE_PATH,
                language="ru")
    
    # Return the generated audio file as response
    return FileResponse(path=result_path, filename='output.wav', media_type='multipart/form-data')
