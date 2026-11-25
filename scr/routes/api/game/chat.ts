import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { getGameDeliveryClient } from "@/lib/game-delivery.server";
import { getServerEnv } from "@/lib/server-env.server";
import {
  parseServerChatSubmission,
  type ServerChatSubmission,
} from "@/lib/server-chat";

const publicFeedLimit = 100;
const publicFeedAgeMs = 24 * 60 * 60 * 1000;

export const Route = createFileRoute("/api/game/chat")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const supabase = createPublicSupabaseClient();
          const cutoff = new Date(Date.now() - publicFeedAgeMs).toISOString();
          const { data, error } = await supabase
            .from("server_chat_messages")
            .select("id,player_name,message,created_at")
            .gte("created_at", cutoff)
            .order("created_at", { ascending: false })
            .limit(publicFeedLimit);
          if (error) throw error;

          const messages = (data ?? []).reverse().map((row) => ({
            id: row.id,
            playerName: row.player_name,
            message: row.message,
            createdAt: row.created_at,
          }));
          return Response.json(
            { messages },
            { headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          console.error("Could not load Minecraft server chat", error);
          return Response.json(
            { error: "Live chat is temporarily unavailable." },
            {
              status: 503,
              headers: { "Cache-Control": "no-store" },
            },
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const supabase = await getGameDeliveryClient(request);
          const contentLength = Number(request.headers.get("content-length"));
          if (Number.isFinite(contentLength) && contentLength > 4096) {
            return Response.json(
              { error: "Chat request is too large." },
              { status: 413 },
            );
          }

          let body: unknown;
          try {
            body = await request.json();
          } catch {
            return Response.json(
              { error: "Request body must be valid JSON." },
              { status: 400 },
            );
          }

          let submission: ServerChatSubmission;
          try {
            submission = parseServerChatSubmission(body);
          } catch (error) {
            return Response.json(
              {
                error:
                  error instanceof Error
                    ? error.message
                    : "The chat message is invalid.",
              },
              { status: 400 },
            );
          }

          const { error } = await supabase.from("server_chat_messages").insert({
            player_name: submission.playerName,
            message: submission.message,
          });
          if (error) throw error;

          return Response.json({ success: true }, { status: 201 });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("Could not save Minecraft server chat message", error);
          return Response.json(
            { error: "The chat message could not be saved." },
            { status: 500 },
          );
        }
      },
    },
  },
});

function createPublicSupabaseClient() {
  const url =
    getServerEnv("VITE_SUPABASE_URL") ?? import.meta.env["VITE_SUPABASE_URL"];
  const anonKey =
    getServerEnv("VITE_SUPABASE_ANON_KEY") ??
    import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) {
    throw new Error("Public Supabase settings are not configured.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
