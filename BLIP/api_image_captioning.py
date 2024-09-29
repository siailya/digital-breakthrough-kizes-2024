import io
import torch
import gc
from PIL import Image
from typing import Annotated, List
from fastapi import FastAPI, File
from transformers import Blip2Processor, Blip2ForConditionalGeneration

# Initialize FastAPI application
app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

# Define LAVIS parameters (currently commented out, you can uncomment and modify as needed)
lavis_params = {
    # "num_beams" : 5,
    # "length_penalty" : -1,
    # "max_length": 100
}

# Determine the device to use for inference
device = "cuda" if torch.cuda.is_available() else "cpu"

# Load the BLIP2 processor and model
processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
model = Blip2ForConditionalGeneration.from_pretrained("Salesforce/blip2-opt-2.7b", torch_dtype=torch.float16).to(device)

@app.post("/send_caption_of_images")
async def update_item(
    byte_images: Annotated[List[bytes], File()],
) -> List[str]:
    """
    Generate captions for a list of provided images.

    Args:
        byte_images (List[bytes]): A list of images in byte format.

    Returns:
        List[str]: A list of captions corresponding to each image.
    """
    images = []
    
    # Convert byte images to PIL images
    for byte_image in byte_images:
        images.append(Image.open(io.BytesIO(byte_image)))
    
    # Process the images and prepare inputs for the model
    inputs = processor(images, return_tensors="pt").to(device, torch.float16)
    out = model.generate(**inputs, **lavis_params)
    decode_results = []
    for o in out:
        decode_results.append(processor.decode(o, skip_special_tokens=True).strip())
    
    # Clear GPU memory if using CUDA
    if device == 'cuda':
        torch.cuda.empty_cache()
    
    # Collect garbage to free up memory
    gc.collect()
    
    return decode_results
