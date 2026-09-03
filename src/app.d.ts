declare global {
  namespace App {}

  interface Window {
    __clearDayWebMcpController?: AbortController;
    SpeechRecognition?: new () => ClearDaySpeechRecognition;
    webkitSpeechRecognition?: new () => ClearDaySpeechRecognition;
  }

  interface ClearDaySpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  }

  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema?: Record<string, unknown>;
          annotations?: Record<string, boolean>;
          execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
        },
        options?: { signal?: AbortSignal }
      ) => Promise<void>;
    };
  }
}

export {};
