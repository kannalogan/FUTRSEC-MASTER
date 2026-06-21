import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export interface VoiceStatus {
  provider: string;
  input: boolean;
  output: boolean;
}

export function useVoiceStatus() {
  return useQuery({
    queryKey: ["ai", "voice", "status"],
    queryFn: () => apiFetch<VoiceStatus>("/api/ai/voice/status"),
    staleTime: 1000 * 60 * 5,
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Records mic audio and transcribes it through the server STT endpoint. */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone access was denied. Please allow mic access or type instead.");
    }
  }, []);

  /** Stops recording, sends audio to the server, returns the transcript (or null). */
  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    const recorder = recorderRef.current;
    if (!recorder) return null;
    setRecording(false);
    setTranscribing(true);
    try {
      const blob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        recorder.stop();
      });
      const audioBase64 = await blobToBase64(blob);
      const res = await apiFetch<{ text: string }>("/api/ai/voice/transcribe", {
        method: "POST",
        body: JSON.stringify({ audioBase64, mimeType: blob.type || "audio/webm" }),
      });
      return res.text;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
      return null;
    } finally {
      setTranscribing(false);
      cleanup();
    }
  }, [cleanup]);

  return { recording, transcribing, error, start, stopAndTranscribe, setError };
}

/** Speaks text via the server TTS endpoint. Returns true on success. */
export async function speak(text: string, voice?: string): Promise<boolean> {
  try {
    const res = await apiFetch<{ audioBase64: string; mimeType: string }>("/api/ai/voice/tts", {
      method: "POST",
      body: JSON.stringify({ text, voice }),
    });
    const audio = new Audio(`data:${res.mimeType};base64,${res.audioBase64}`);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
