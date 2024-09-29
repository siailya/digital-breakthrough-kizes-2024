import numpy as np
import torch
import traceback
import triton_python_backend_utils as pb_utils


from transformers import pipeline
from transformers import WhisperTokenizer, WhisperForConditionalGeneration, WhisperFeatureExtractor
from transformers import pipeline


class TritonPythonModel:


    def initialize(self, args):
        tokenizer = WhisperTokenizer.from_pretrained("openai/whisper-large-v2")
        feature_extractor = WhisperFeatureExtractor.from_pretrained("openai/whisper-large-v2")
        model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v2")
        model = model.to("cuda")
        self.forced_decoder_ids = tokenizer.get_decoder_prompt_ids(language="russian", task="transcribe")
        self.pipe = pipeline(
                    "automatic-speech-recognition",
                    model=model,
                    torch_dtype=torch.float16,
                    feature_extractor=feature_extractor,
                    tokenizer=tokenizer,
                    chunk_length_s=30,
                    stride_length_s=(4, 2)
                )


    def execute(self, requests):
      
        
        logger = pb_utils.Logger

        try:
            responses = []
            for request in requests:
                audio = pb_utils.get_input_tensor_by_name(request, "audio").as_numpy()
                sample_rate = pb_utils.get_input_tensor_by_name(request, "sample_rate").as_numpy()
                audio = audio[0] # т.к макс батчсайз = 1
                inputs = {
                    "path": "some",
                    "array": audio,
                    "sampling_rate": sample_rate
                }

                outputs = self.pipe(inputs.copy(), 
                                   generate_kwargs={"forced_decoder_ids": self.forced_decoder_ids}, 
                                   batch_size=24, 
                                   return_timestamps=True)['chunks']

                if outputs[-1]['timestamp'] is None:
                    outputs[-1]['timestamp'] = (outputs[-1]['timestamp'][0], len(audio) / sample_rate[0][0])  # почему-то последний timecode это None
                texts = [i['text'] for i in outputs]
                timecodes = [i['timestamp'] for i in outputs]
                timecodes = np.array(timecodes).astype(np.float32).reshape((1, -1, 2))
                out_text_tensor = pb_utils.Tensor("texts", np.array(texts, dtype=np.object_))
                out_timestamps_tensor = pb_utils.Tensor("timestamps", np.array(timecodes).astype(np.float32).reshape((1, -1, 2)))

                responses.append(pb_utils.InferenceResponse(output_tensors=[out_text_tensor, out_timestamps_tensor]))
            return responses
        except Exception as ex:
            logger.log_error(f"Error processing request {request}: {traceback.format_exception(ex.__class__, ex, ex.__traceback__)}")
            raise ex
