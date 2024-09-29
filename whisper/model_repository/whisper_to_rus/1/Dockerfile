FROM pytorch/pytorch:2.4.1-cuda11.8-cudnn9-runtime

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1

# Keeps Python from buffering stdout and stderr to avoid situations where
# the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY . .

RUN python -m pip install -r requirements.txt

RUN python -c "from transformers import pipeline; import torch; \
                 pipeline('automatic-speech-recognition', 'openai/whisper-large-v2', torch_dtype=torch.float16);"


EXPOSE 8000

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]