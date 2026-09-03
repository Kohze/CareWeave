declare global {
  namespace App {}

  interface Window {
    __careWeaveWebMcpController?: AbortController;
    SpeechRecognition?: new () => CareWeaveSpeechRecognition;
    webkitSpeechRecognition?: new () => CareWeaveSpeechRecognition;
  }

  interface CareWeaveSpeechRecognition {
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
          annotations?: {
            readOnlyHint?: boolean;
            untrustedContentHint?: boolean;
            consequentialHint?: boolean;
          };
          execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
        },
        options?: { signal?: AbortSignal }
      ) => Promise<void>;
    };
  }
}

export {};
