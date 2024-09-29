FROM vllm/vllm-openai:v0.6.0

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]