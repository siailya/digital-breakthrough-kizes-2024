import io
import torch
from PIL import Image
from typing import Annotated
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from diffusers import AutoPipelineForText2Image

# Initialize FastAPI application
app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

# Determine the device to use for inference
device = "cuda" if torch.cuda.is_available() else "cpu"

# Initialize the text-to-image pipeline with the chosen model
pipeline_text2image = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    torch_dtype=torch.float16,
    variant="fp16",
    use_safetensors=True
).to(device)

async def image_to_byte_array(image: Image.Image) -> bytes:
    """
    Convert a PIL Image object to a byte array.

    Args:
        image (Image.Image): The image to be converted.

    Returns:
        bytes: The image as a byte array.
    """
    imgByteArr = io.BytesIO()
    image.save(imgByteArr, format='JPEG')
    imgByteArr = imgByteArr.getvalue()
    return imgByteArr

@app.post('/draw_image')
async def model_prediction(
    prompt: Annotated[str, File()]
    ) -> Response:
    """
    Generate an image based on the provided text prompt.

    Args:
        prompt (str): The text prompt to generate the image from.

    Returns:
        Response: The generated image in JPEG format.
    """
    # Generate an image from the text prompt
    image = pipeline_text2image(prompt=prompt).images[0]
    
    # Convert the generated image to a byte array
    bytes_image = await image_to_byte_array(image)
    
    # Return the image as a JPEG response
    return Response(content=bytes_image, media_type="image/jpeg")
