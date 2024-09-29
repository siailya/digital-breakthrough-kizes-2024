import OpenAI from "openai";
import {LLM_BACKEND} from "./config";

// ЗАПРОСЫ НА VLLM, ИСПОЛЬЗУЕТСЯ ТОЛЬКО АДАПТЕР OPENAI (БЕЗ ВНЕШНИХ API)
const client = new OpenAI({
    apiKey: '',
    baseURL: LLM_BACKEND,
    defaultQuery: undefined,
    defaultHeaders: {
        "x-node-id" : "bt1jlk7jdq3cd8a8p15p",
        "Authorization": "Bearer t1.9euelZrOk5vPyJaRi8yJlM-TzMyVju3rnpWais6XkMzKzsedmI3OlMaLmZnl8_cMZBxI-e9mLHkO_t3z90wSGkj572YseQ7-zef1656VmpyKzJKdm8yZkI-KzsjIy5GY7_zF656VmpyKzJKdm8yZkI-KzsjIy5GY.NTvP75sE6kY_CAy-ZVW8P8ful2VaGOLN-7RC3GQnT_ezFwwRitHgAVLElc4Q-wTNdWQXYizWxt2SpD01qbh2BA",
        "x-folder-id": "b1gvmo70ll74cvokevfk"
    }
});

export const requestLlm = async (prompt: string): Promise<string> => {
    const r = await client.chat.completions.create({
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "model": "unsloth/Meta-Llama-3.1-8B-Instruct",
        "max_tokens": 2000,
        "temperature": 0.5,
        // @ts-ignore
        "top_k": 40,
        "top_p": 1.0,
        "repetition_penalty": 1.0,
        "min_p": 0.1
    })

    return r.choices[0].message.content as string
}

