export type GenerateTextOptions = {
  apiKey: string;
  model?: string;
  prompt: string;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function generateWithGroq(options: GenerateTextOptions): Promise<string> {
  const model = options.model ?? "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You help developers turn local Git activity into authentic professional updates.",
        },
        {
          role: "user",
          content: options.prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 240,
    }),
  });

  const body = (await response.json()) as GroqChatCompletionResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? `Groq request failed with status ${response.status}`);
  }

  const text = body.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  return text;
}
