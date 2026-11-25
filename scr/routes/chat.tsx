import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CopyIp } from "@/components/site/ServerStatus";
import { InfoPage } from "@/components/site/InfoPage";
import { useServerChat } from "@/hooks/use-server-chat";
import { site } from "@/config/site";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/chat")({
  head: () =>
    seo(
      "Server Chat",
      "Join Craft SMP in Minecraft to chat with players and connect with the community.",
    ),
  component: ServerChatPage,
});

function ServerChatPage() {
  const { messages, loading, error } = useServerChat();
  const chatLogRef = useRef<HTMLDivElement>(null);
  const shouldStickToLatest = useRef(true);

  useEffect(() => {
    const chatLog = chatLogRef.current;
    if (chatLog && shouldStickToLatest.current) {
      chatLog.scrollTop = chatLog.scrollHeight;
    }
  }, [messages]);

  return (
    <InfoPage
      title="Server Chat"
      sub="Join Craft SMP to talk with players, coordinate builds, and share your next adventure."
    >
      <section className="rounded-2xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-xl bg-brand">
            <MessageCircle className="size-6" />
          </div>
          <div>
            <h2 className="mt-0">Chat in Minecraft</h2>
            <p className="text-sm text-muted-foreground">
              Server chat is available after you connect in-game.
            </p>
          </div>
        </div>

        <div
          ref={chatLogRef}
          role="log"
          aria-label="Recent Minecraft server chat"
          aria-live="off"
          aria-busy={loading}
          onScroll={(event) => {
            const element = event.currentTarget;
            shouldStickToLatest.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              48;
          }}
          className="mt-6 h-80 overflow-y-auto rounded-xl bg-soft p-4"
        >
          {loading && messages.length === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Connecting to live server chat…
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && messages.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No recent messages. Join in-game and start the conversation.
            </p>
          )}
          {messages.length > 0 && (
            <ol className="space-y-3">
              {messages.map((item) => (
                <li key={item.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-ink">
                      {item.playerName}
                    </span>
                    <time
                      dateTime={item.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="break-words text-foreground">{item.message}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Recent in-game messages refresh automatically every five seconds.
        </p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            "Open Multiplayer in Minecraft.",
            `Connect to ${site.serverAddress}.`,
            "Open chat in-game and say hello.",
          ].map((step, index) => (
            <li
              key={step}
              className="rounded-xl border bg-background p-4 text-sm"
            >
              <span className="font-display text-2xl text-gradient">
                0{index + 1}
              </span>
              <p className="mt-2 text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <CopyIp />
          <Button asChild variant="soft">
            <Link to="/community">
              <Users /> Community guidelines
            </Link>
          </Button>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border bg-card p-5 shadow-soft">
        <ShieldCheck className="mt-1 size-5 shrink-0 text-ink" />
        <p className="text-sm text-muted-foreground">
          Be kind, protect personal information, and follow the server rules.
          Use the{" "}
          <Link to="/support" className="text-ink underline">
            support page
          </Link>{" "}
          if you need help.
        </p>
      </div>
    </InfoPage>
  );
}
