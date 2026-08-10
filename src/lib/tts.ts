/**
 * Low-latency ElevenLabs playback via /api/fn/tts
 * - Streams first audio bytes ASAP (MediaSource when supported)
 * - Falls back to fast full-blob play on Safari
 * - Caches clips so re-listen is instant
 */

let currentAudio: HTMLAudioElement | null = null;
let currentAbort: AbortController | null = null;
const cache = new Map<string, string>(); // text -> object URL

function hashKey(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 900);
}

export function stopSpeaking() {
  currentAbort?.abort();
  currentAbort = null;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
}

function waitForEnd(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    if (audio.ended) {
      resolve();
      return;
    }
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
  });
}

async function playObjectUrl(url: string): Promise<void> {
  const audio = new Audio(url);
  currentAudio = audio;
  await audio.play();
  await waitForEnd(audio);
}

/** Append-stream MP3 and start playback on first chunk. */
async function playStreamingMpeg(response: Response): Promise<string> {
  if (!response.body) throw new Error("No audio body");

  const mime = "audio/mpeg";
  const canMse =
    typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(mime);

  if (!canMse) {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    await playObjectUrl(url);
    return url;
  }

  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  const audio = new Audio();
  currentAudio = audio;
  audio.preload = "auto";
  audio.src = objectUrl;

  const chunksForCache: Uint8Array[] = [];

  await new Promise<void>((resolve, reject) => {
    mediaSource.addEventListener(
      "sourceopen",
      async () => {
        let sourceBuffer: SourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer(mime);
        } catch (e) {
          reject(e);
          return;
        }

        const reader = response.body!.getReader();
        const queue: Uint8Array[] = [];
        let appending = false;
        let readingDone = false;
        let started = false;

        const finishIfIdle = () => {
          if (readingDone && !queue.length && !appending) {
            try {
              if (mediaSource.readyState === "open") mediaSource.endOfStream();
            } catch {
              /* ignore */
            }
            resolve();
          }
        };

        const pump = () => {
          if (appending || !queue.length) {
            finishIfIdle();
            return;
          }
          appending = true;
          const chunk = queue.shift()!;
          try {
            sourceBuffer.appendBuffer(chunk);
          } catch (e) {
            appending = false;
            reject(e);
          }
        };

        sourceBuffer.addEventListener("updateend", () => {
          appending = false;
          pump();
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              readingDone = true;
              pump();
              break;
            }
            if (value?.byteLength) {
              chunksForCache.push(value);
              queue.push(value);
              pump();
              if (!started) {
                started = true;
                void audio.play().catch(() => {
                  /* autoplay quirks */
                });
              }
            }
          }
        } catch (e) {
          reject(e);
        }
      },
      { once: true },
    );
  });

  await waitForEnd(audio);

  // Build a stable blob URL for cache (MSE object URLs are less reliable to reuse)
  const total = chunksForCache.reduce((n, c) => n + c.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunksForCache) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return URL.createObjectURL(new Blob([merged], { type: "audio/mpeg" }));
}

export async function speakWithElevenLabs(
  text: string,
  opts?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (e: Error) => void;
  },
): Promise<void> {
  const key = hashKey(text);
  if (!key) return;

  stopSpeaking();

  const cached = cache.get(key);
  if (cached) {
    opts?.onStart?.();
    try {
      await playObjectUrl(cached);
      opts?.onEnd?.();
    } catch (e) {
      opts?.onError?.(e instanceof Error ? e : new Error("Playback failed"));
    }
    return;
  }

  const abort = new AbortController();
  currentAbort = abort;
  opts?.onStart?.();

  try {
    const response = await fetch("/api/fn/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: key }),
      signal: abort.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error || `TTS HTTP ${response.status}`,
      );
    }

    const blobUrl = await playStreamingMpeg(response);
    const prev = cache.get(key);
    cache.set(key, blobUrl);
    if (prev) URL.revokeObjectURL(prev);

    opts?.onEnd?.();
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      opts?.onEnd?.();
      return;
    }
    opts?.onError?.(e instanceof Error ? e : new Error("TTS failed"));
  } finally {
    if (currentAbort === abort) currentAbort = null;
  }
}
