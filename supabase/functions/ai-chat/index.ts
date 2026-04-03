/**
 * BITLOT - AI Chat Edge Function
 *
 * Proxies chat requests to an OpenAI-compatible provider (OpenRouter)
 * so API keys stay on the server.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (item): item is ChatMessage =>
        !!item &&
        typeof item === "object" &&
        (item as { role?: unknown }).role !== undefined &&
        typeof (item as { content?: unknown }).content === "string",
    )
    .map((item): ChatMessage => {
      const role: ChatMessage["role"] =
        item.role === "assistant" ? "assistant" : "user";

      return {
        role,
        content: item.content.trim(),
      };
    })
    .filter((item) => item.content.length > 0)
    .slice(-12);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: JSON_HEADERS },
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const AI_MODEL = Deno.env.get("AI_MODEL") || "openai/gpt-4o-mini";

    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured. Add it in Supabase secrets.",
      );
    }

    const payload = await req.json();
    const messages = normalizeMessages(payload?.messages);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "At least one message is required.",
        }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const modelResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
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
    });

    const rawText = await modelResponse.text();
    let modelPayload: Record<string, unknown> = {};

    try {
      modelPayload = JSON.parse(rawText);
    } catch {
      modelPayload = { rawText };
    }

    if (!modelResponse.ok) {
      const message =
        (modelPayload?.error as { message?: string } | undefined)?.message ||
        (modelPayload?.rawText as string | undefined) ||
        "Unknown model provider error";

      throw new Error(
        `AI provider error [${modelResponse.status}]: ${message}`,
      );
    }

    const choices = modelPayload?.choices as
      | Array<{ message?: { content?: string } }>
      | undefined;

    const reply = choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("AI provider returned an empty response.");
    }

    return new Response(JSON.stringify({ success: true, response: reply }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error: unknown) {
    console.error("ai-chat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
