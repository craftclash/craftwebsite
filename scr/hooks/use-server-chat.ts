import { useEffect, useState } from "react";

export type ServerChatMessage = {
  id: string;
  playerName: string;
  message: string;
  createdAt: string;
};

const refreshIntervalMs = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMessages(value: unknown): ServerChatMessage[] {
  if (!isRecord(value) || !Array.isArray(value["messages"])) {
    throw new Error("Chat response is invalid.");
  }

  return value["messages"].map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item["id"] !== "string" ||
      typeof item["playerName"] !== "string" ||
      typeof item["message"] !== "string" ||
      typeof item["createdAt"] !== "string" ||
      !Number.isFinite(Date.parse(item["createdAt"]))
    ) {
      throw new Error("Chat response is invalid.");
    }

    return {
      id: item["id"],
      playerName: item["playerName"],
      message: item["message"],
      createdAt: item["createdAt"],
    };
  });
}

export function useServerChat() {
  const [messages, setMessages] = useState<ServerChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let controller: AbortController | undefined;

    const refresh = async () => {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      controller = new AbortController();

      try {
        const response = await fetch("/api/game/chat", {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Chat request failed with status ${response.status}.`,
          );
        }

        const nextMessages = parseMessages(await response.json());
        if (!active) return;
        setMessages((current) => {
          if (
            current.length === nextMessages.length &&
            current.at(-1)?.id === nextMessages.at(-1)?.id
          ) {
            return current;
          }
          return nextMessages;
        });
        setError(null);
      } catch (requestError) {
        if (
          !active ||
          (requestError instanceof Error && requestError.name === "AbortError")
        ) {
          return;
        }
        setError("Live chat is temporarily unavailable. Retrying shortly.");
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    };

    void refresh();
    const intervalId = window.setInterval(
      () => void refresh(),
      refreshIntervalMs,
    );
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  return { messages, loading, error };
}
