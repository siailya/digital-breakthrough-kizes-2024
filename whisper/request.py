import tritonclient.grpc as grpcclient
import librosa
import numpy as np
from tritonclient.utils import np_to_triton_dtype

# Configuration
model_name = "whisper_hf"
server_url = "localhost:8001"

# Initialize the Triton Inference Server client
triton_client = grpcclient.InferenceServerClient(url=server_url)

# Load audio file and preprocess it
audio, sample_rate = librosa.load("/work/cut_output_mono.wav")
audio = np.array(audio).reshape((1, -1))
sample_rate = np.array(sample_rate).reshape((1, -1)).astype(np.int32)

# Create Triton inputs for the audio data and corresponding sample rate
inputs = [
        grpcclient.InferInput(
            "audio", audio.shape, np_to_triton_dtype(audio.dtype)
        ),
        grpcclient.InferInput(
            "sample_rate", sample_rate.shape, np_to_triton_dtype(sample_rate.dtype)
        )
    ]

# Set the input data from numpy arrays
inputs[0].set_data_from_numpy(audio)
inputs[1].set_data_from_numpy(sample_rate)

# Perform inference on the Triton Inference Server
result = triton_client.infer(model_name, inputs)

# Process and print the results
print(result.as_numpy("timestamps"))
for row in result.as_numpy("texts"):
    print(row.decode("utf-8"))
