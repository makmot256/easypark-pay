import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatResponse {
  success: boolean;
  response?: string;
  error?: string;
}

const LOCAL_OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as
  | string
  | undefined;
const LOCAL_OPENROUTER_MODEL =
  (import.meta.env.VITE_AI_MODEL as string | undefined) || "openai/gpt-4o-mini";

async function extractErrorMessage(error: unknown): Promise<string> {
  const fallback =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message)
      : "Unable to reach assistant";

  const context =
    error && typeof error === "object" && "context" in error
      ? (error as { context?: Response }).context
      : undefined;

  if (!context || typeof context.text !== "function") {
    return fallback;
  }

  try {
    const text = await context.text();
    if (!text) return fallback;

    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string };
      return parsed.error || parsed.message || text;
    } catch {
      return text;
    }
  } catch {
    return fallback;
  }
}

export async function askAIAssistant(
  messages: ChatMessage[],
): Promise<AIChatResponse> {
  const { data, error } = await supabase.functions.invoke("ai-chat", {
    body: { messages },
  });

  if (!error) {
    return data as AIChatResponse;
  }

  const functionErrorMessage = await extractErrorMessage(error);

  // Fallback mode for local/dev when edge function deployment is unavailable.
  if (LOCAL_OPENROUTER_KEY) {
    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOCAL_OPENROUTER_KEY}`,
          },
          body: JSON.stringify({
            model: LOCAL_OPENROUTER_MODEL,
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content:
                  "You are BITLOT assistant. Answer clearly and briefly. Help with parking tickets, payment flow, troubleshooting, and app usage.",
              },
              ...messages,
            ],
          }),
        },
      );

      const rawText = await response.text();
      let payload: Record<string, unknown> = {};

      try {
        payload = JSON.parse(rawText);
      } catch {
        payload = { rawText };
      }

      if (!response.ok) {
        const providerMessage =
          (payload?.error as { message?: string } | undefined)?.message ||
          (payload?.rawText as string | undefined) ||
          "Unknown AI provider error";
        return {
          success: false,
          error: `AI provider error [${response.status}]: ${providerMessage}`,
        };
      }

      const choices = payload?.choices as
        | Array<{ message?: { content?: string } }>
        | undefined;
      const content = choices?.[0]?.message?.content?.trim();

      if (!content) {
        return { success: false, error: "AI provider returned empty content." };
      }

      return { success: true, response: content };
    } catch (fallbackErr) {
      const message =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : "Fallback AI call failed";
      return { success: false, error: `${functionErrorMessage} | ${message}` };
    }
  }

  return { success: false, error: functionErrorMessage };
}
