const minecraftUsernamePattern = /^\.?[A-Za-z0-9_]{3,16}$/;
const maxMessageLength = 256;

function containsControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
  });
}

export type ServerChatSubmission = {
  playerName: string;
  message: string;
};

export function parseServerChatSubmission(
  value: unknown,
): ServerChatSubmission {
  if (!value || typeof value !== "object") {
    throw new Error("A chat message is required.");
  }

  const body = value as Record<string, unknown>;
  const playerName = body["playerName"];
  const message = body["message"];

  if (
    typeof playerName !== "string" ||
    !minecraftUsernamePattern.test(playerName)
  ) {
    throw new Error("A valid Minecraft username is required.");
  }
  if (
    typeof message !== "string" ||
    Array.from(message).length > maxMessageLength ||
    containsControlCharacters(message)
  ) {
    throw new Error("The chat message is invalid.");
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw new Error("The chat message cannot be empty.");
  }

  return { playerName, message: trimmedMessage };
}
