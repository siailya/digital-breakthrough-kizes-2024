import io
import torch
from PIL import Image
from typing import Annotated, Union, Optional, List
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse, Response
from diffusers import AutoPipelineForText2Image

app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

device = "cuda" if torch.cuda.is_available() else "cpu"
pipeline_text2image = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True
).to(device)

async def image_to_byte_array(image: Image.Image) -> bytes:
  imgByteArr = io.BytesIO()
  image.save(imgByteArr, format='JPEG')
  imgByteArr = imgByteArr.getvalue()
  return imgByteArr

@app.post('/draw_image')
async def model_prediction(
    prompt: Annotated[str, File()]
    ) -> Response:
    
    image = pipeline_text2image(prompt=prompt).images[0]
    bytes_image = await image_to_byte_array(image)
    
    return Response(content=bytes_image, media_type="image/jpeg")
