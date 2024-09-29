#!/bin/bash
vllm serve unsloth/Meta-Llama-3.1-8B-Instruct --dtype float16 --gpu_memory-utilization 0.98 --max_model_len 40000 --enable-chunked-prefill=False