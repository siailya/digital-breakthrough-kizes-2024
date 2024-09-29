import io
import torch
import gc
from PIL import Image
from typing import Annotated, Union, Optional, List
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse, Response
from transformers import Blip2Processor, Blip2ForConditionalGeneration

app = FastAPI(swagger_ui_parameters={"syntaxHighlight": True})

lavis_params = {
    # "num_beams" : 5,
    # "length_penalty" : -1,
    # "max_length": 100
}

device = "cuda" if torch.cuda.is_available() else "cpu"
processor = Blip2Processor.from_pretrained("Salesforce/blip2-opt-2.7b")
model = Blip2ForConditionalGeneration.from_pretrained("Salesforce/blip2-opt-2.7b", torch_dtype=torch.float16).to(device)

@app.post("/send_caption_of_images")
async def update_item(
    byte_images: Annotated[List[bytes], File()],
) -> List[str]:
    images = []
    for byte_image in byte_images:
        images += [Image.open(io.BytesIO(byte_image))]
    inputs = processor(images, return_tensors="pt").to(device, torch.float16)
    out = model.generate(**inputs, **lavis_params)
    decode_results = []
    for o in out:
        decode_results += [processor.decode(o, skip_special_tokens=True).strip()]
    if device == 'cuda':
        torch.cuda.empty_cache()
    gc.collect()
    return decode_results
