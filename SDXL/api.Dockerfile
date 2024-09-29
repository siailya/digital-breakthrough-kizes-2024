ARG PYTHON_VERSION=3.10.4
# FROM python:${PYTHON_VERSION}-slim as base
FROM pytorch/pytorch:2.4.1-cuda12.4-cudnn9-devel

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    python -m pip install -r requirements.txt

# RUN python -m pip install torch --index-url https://download.pytorch.org/whl/cu124
RUN python -c "from diffusers import AutoPipelineForText2Image; import torch; AutoPipelineForText2Image.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0', torch_dtype=torch.float16, variant='fp16', use_safetensors=True)"

USER root

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api_t2i:app", "--host", "0.0.0.0", "--port", "8000"]