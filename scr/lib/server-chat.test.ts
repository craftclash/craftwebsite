import { describe, expect, it } from "vitest";
import { parseServerChatSubmission } from "./server-chat";

describe("Minecraft live chat validation", () => {
  it("accepts player chat and trims surrounding whitespace", () => {
    expect(
      parseServerChatSubmission({
        playerName: ".Bedrock_123",
        message: "  Hello, Craft SMP!  ",
      }),
    ).toEqual({
      playerName: ".Bedrock_123",
      message: "Hello, Craft SMP!",
    });
  });

  it("rejects invalid names, empty messages, controls, and oversized text", () => {
    expect(() =>
      parseServerChatSubmission({
        playerName: "Player;op",
        message: "Hello",
      }),
    ).toThrow("A valid Minecraft username is required.");

    expect(() =>
      parseServerChatSubmission({ playerName: "Player123", message: "  " }),
    ).toThrow("The chat message cannot be empty.");

    expect(() =>
      parseServerChatSubmission({
        playerName: "Player123",
        message: `Hello\n${"x".repeat(256)}`,
      }),
    ).toThrow("The chat message is invalid.");

    expect(() =>
      parseServerChatSubmission({
        playerName: "Player123",
        message: "Hello\u0000world",
      }),
    ).toThrow("The chat message is invalid.");

    expect(() =>
      parseServerChatSubmission({
        playerName: "Player123",
        message: "😀".repeat(257),
      }),
    ).toThrow("The chat message is invalid.");
  });
});
