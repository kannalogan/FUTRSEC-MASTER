import OpenAI from "openai";
import { logger } from "../logger";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

export type ProviderName = "openai" | "gemini" | "mock";

export interface RawProvider {
  name: ProviderName;
  chat(messages: ChatMessage[], opts?: ChatOptions): Promise<string>;
  transcribe?(audio: Buffer, mimeType: string): Promise<string>;
  speak?(text: string, voice?: string): Promise<{ audio: Buffer; mimeType: string }>;
}

/* ------------------------------------------------------------------ */
/* OpenAI provider — Replit AI integration base-url OR user API key.    */
/* ------------------------------------------------------------------ */

interface OpenAICfg {
  apiKey: string;
  baseURL?: string;
  model: string;
}

function openAICfg(): OpenAICfg | null {
  const intBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const intKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (intBase && intKey) {
    return { apiKey: intKey, baseURL: intBase, model: process.env.AI_OPENAI_MODEL || "gpt-5-mini" };
  }
  const key = process.env.OPENAI_API_KEY;
  if (key) return { apiKey: key, model: process.env.AI_OPENAI_MODEL || "gpt-4o-mini" };
  return null;
}

let _client: OpenAI | null = null;
function openAIClient(cfg: OpenAICfg): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  return _client;
}

function isReasoningModel(model: string): boolean {
  return /^(gpt-5|o\d)/i.test(model);
}

function openAIProvider(): RawProvider | null {
  const cfg = openAICfg();
  if (!cfg) return null;
  const client = openAIClient(cfg);

  return {
    name: "openai",
    async chat(messages, opts) {
      const params: Record<string, unknown> = {
        model: cfg.model,
        messages,
      };
      if (isReasoningModel(cfg.model)) {
        params.max_completion_tokens = opts?.maxTokens ?? 2048;
      } else {
        params.max_tokens = opts?.maxTokens ?? 2048;
        params.temperature = opts?.temperature ?? 0.7;
      }
      if (opts?.json) params.response_format = { type: "json_object" };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await client.chat.completions.create(params as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (r as any).choices?.[0]?.message?.content ?? "";
    },
    async transcribe(audio, mimeType) {
      const ext = mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("mp3") || mimeType.includes("mpeg")
          ? "mp3"
          : mimeType.includes("ogg")
            ? "ogg"
            : "webm";
      const file = await OpenAI.toFile(audio, `audio.${ext}`, { type: mimeType });
      const r = await client.audio.transcriptions.create({
        file,
        model: process.env.AI_STT_MODEL || "gpt-4o-mini-transcribe",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (r as any).text ?? "";
    },
    async speak(text, voice) {
      const r = await client.audio.speech.create({
        model: process.env.AI_TTS_MODEL || "tts-1",
        voice: (voice as "alloy") || "alloy",
        input: text,
      });
      const buf = Buffer.from(await r.arrayBuffer());
      return { audio: buf, mimeType: "audio/mpeg" };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Gemini provider — REST (no SDK dependency).                         */
/* ------------------------------------------------------------------ */

interface GeminiCfg {
  apiKey: string;
  baseURL: string;
  model: string;
}

function geminiCfg(): GeminiCfg | null {
  const intBase = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  const intKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const model = process.env.AI_GEMINI_MODEL || "gemini-2.5-flash";
  if (intBase && intKey) return { apiKey: intKey, baseURL: intBase.replace(/\/$/, ""), model };
  const key = process.env.GEMINI_API_KEY;
  if (key) return { apiKey: key, baseURL: "https://generativelanguage.googleapis.com", model };
  return null;
}

function geminiProvider(): RawProvider | null {
  const cfg = geminiCfg();
  if (!cfg) return null;

  return {
    name: "gemini",
    async chat(messages, opts) {
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          maxOutputTokens: opts?.maxTokens ?? 2048,
          ...(opts?.json ? { responseMimeType: "application/json" } : {}),
        },
      };
      if (system) body.systemInstruction = { parts: [{ text: system }] };

      const url = `${cfg.baseURL}/v1beta/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`Gemini request failed (${res.status}): ${errText.slice(0, 200)}`);
      }
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    },
  };
}

/* ------------------------------------------------------------------ */
/* Selection                                                           */
/* ------------------------------------------------------------------ */

export function getProviderName(): ProviderName {
  return selectProvider()?.name ?? "mock";
}

export function selectProvider(): RawProvider | null {
  const forced = process.env.AI_PROVIDER?.toLowerCase();
  if (forced === "mock") return null;
  if (forced === "openai") return openAIProvider();
  if (forced === "gemini") return geminiProvider();
  // auto: prefer OpenAI, then Gemini, then mock.
  return openAIProvider() ?? geminiProvider();
}

/** True when a provider that can transcribe audio is configured. */
export function sttProvider(): RawProvider | null {
  const p = selectProvider();
  return p?.transcribe ? p : null;
}

/** True when a provider that can synthesize speech is configured. */
export function ttsProvider(): RawProvider | null {
  const p = selectProvider();
  return p?.speak ? p : null;
}

export function logProviderOnce(): void {
  if (_logged) return;
  _logged = true;
  logger.info({ provider: getProviderName() }, "AI provider selected");
}
let _logged = false;
