FROM pytorch/pytorch:2.4.1-cuda12.4-cudnn9-devel

ENV PYTHONDONTWRITEBYTECODE=1

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

RUN python -c "import torch; from transformers import Blip2Processor, Blip2ForConditionalGeneration; Blip2Processor.from_pretrained('Salesforce/blip2-opt-2.7b');Blip2ForConditionalGeneration.from_pretrained('Salesforce/blip2-opt-2.7b', torch_dtype=torch.float16);"

USER root

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api_image_captioning:app", "--host", "0.0.0.0", "--port", "8000"]