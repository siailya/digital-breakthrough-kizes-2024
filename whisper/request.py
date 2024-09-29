import tritonclient.grpc as grpcclient
import librosa
import numpy as np


from tritonclient.utils import np_to_triton_dtype


model_name = "whisper_hf"
server_url = "localhost:8001"
triton_client = grpcclient.InferenceServerClient(url=server_url)

audio, sample_rate = librosa.load("/work/cut_output_mono.wav")
audio = np.array(audio).reshape((1, -1))
sample_rate = np.array(sample_rate).reshape((1, -1)).astype(np.int32)

inputs = [
        grpcclient.InferInput(
            "audio", audio.shape, np_to_triton_dtype(audio.dtype)
        ),
        grpcclient.InferInput(
            "sample_rate", sample_rate.shape, np_to_triton_dtype(sample_rate.dtype)
        )
    ]
inputs[0].set_data_from_numpy(audio)
inputs[1].set_data_from_numpy(sample_rate)

result = triton_client.infer(model_name, inputs)
print(result.as_numpy("timestamps"))
for row in result.as_numpy("texts"):
    print(row.decode("utf-8"))
