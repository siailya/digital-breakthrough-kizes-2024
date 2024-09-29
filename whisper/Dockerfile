FROM nvcr.io/nvidia/tritonserver:24.05-py3

ENV MODEL_NAME="openai/whisper-large-v2"

RUN pip install --upgrade torch torchvision torchaudio
RUN pip install git+https://github.com/huggingface/transformers
RUN pip install accelerate optimum librosa

RUN python3 -c "from transformers import pipeline; import torch; \
                 pipeline('automatic-speech-recognition', 'openai/whisper-large-v2', torch_dtype=torch.float16);"

WORKDIR /app

COPY . .
RUN chmod +x entrypoint.sh
# ENTRYPOINT ["./entrypoint.sh"]