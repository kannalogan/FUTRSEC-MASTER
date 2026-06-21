import { logger } from "../logger";
import {
  selectProvider,
  sttProvider,
  ttsProvider,
  getProviderName,
  type ChatMessage,
  type ProviderName,
} from "./provider";

export { getProviderName, type ProviderName, type ChatMessage } from "./provider";

function extractJSON(text: string): string {
  let t = text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // Fall back to the outermost {...} or [...] block.
  const firstObj = t.indexOf("{");
  const firstArr = t.indexOf("[");
  const start =
    firstArr === -1 ? firstObj : firstObj === -1 ? firstArr : Math.min(firstObj, firstArr);
  if (start > 0) t = t.slice(start);
  const lastObj = t.lastIndexOf("}");
  const lastArr = t.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end >= 0 && end < t.length - 1) t = t.slice(0, end + 1);
  return t;
}

export interface TextGenInput {
  system: string;
  user: string;
  history?: ChatMessage[];
  mock: () => string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateText(
  input: TextGenInput,
): Promise<{ text: string; provider: ProviderName }> {
  const provider = selectProvider();
  if (!provider) return { text: input.mock(), provider: "mock" };
  try {
    const messages: ChatMessage[] = [
      { role: "system", content: input.system },
      ...(input.history ?? []),
      { role: "user", content: input.user },
    ];
    const text = await provider.chat(messages, {
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    });
    const trimmed = (text ?? "").trim();
    return { text: trimmed || input.mock(), provider: provider.name };
  } catch (err) {
    logger.warn({ err, provider: provider.name }, "AI text generation failed; using mock fallback");
    return { text: input.mock(), provider: "mock" };
  }
}

export interface JsonGenInput<T> {
  system: string;
  user: string;
  mock: () => T;
  maxTokens?: number;
  validate?: (value: unknown) => value is T;
}

export async function generateJSON<T>(
  input: JsonGenInput<T>,
): Promise<{ data: T; provider: ProviderName }> {
  const provider = selectProvider();
  if (!provider) return { data: input.mock(), provider: "mock" };
  try {
    const text = await provider.chat(
      [
        {
          role: "system",
          content: `${input.system}\n\nRespond ONLY with a single valid JSON value. No prose, no markdown fences.`,
        },
        { role: "user", content: input.user },
      ],
      { json: true, maxTokens: input.maxTokens },
    );
    const parsed = JSON.parse(extractJSON(text)) as unknown;
    if (input.validate && !input.validate(parsed)) {
      throw new Error("AI JSON failed validation");
    }
    return { data: parsed as T, provider: provider.name };
  } catch (err) {
    logger.warn({ err, provider: provider.name }, "AI JSON generation failed; using mock fallback");
    return { data: input.mock(), provider: "mock" };
  }
}

/* --------------------------- Voice helpers --------------------------- */

export interface VoiceStatus {
  provider: ProviderName;
  input: boolean; // speech-to-text available
  output: boolean; // text-to-speech available
}

export function voiceStatus(): VoiceStatus {
  return {
    provider: getProviderName(),
    input: sttProvider() !== null,
    output: ttsProvider() !== null,
  };
}

export async function transcribeAudio(audio: Buffer, mimeType: string): Promise<string> {
  const p = sttProvider();
  if (!p || !p.transcribe) {
    throw new Error("Speech-to-text is not available with the current AI provider.");
  }
  return p.transcribe(audio, mimeType);
}

export async function synthesizeSpeech(
  text: string,
  voice?: string,
): Promise<{ audio: Buffer; mimeType: string }> {
  const p = ttsProvider();
  if (!p || !p.speak) {
    throw new Error("Text-to-speech is not available with the current AI provider.");
  }
  return p.speak(text, voice);
}
