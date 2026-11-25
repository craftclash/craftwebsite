import { Copy, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

export function copyAddress(
  addressOrEvent: string | unknown = site.serverAddress,
  label = "Server address",
) {
  const address =
    typeof addressOrEvent === "string" ? addressOrEvent : site.serverAddress;
  navigator.clipboard.writeText(address).then(
    () =>
      toast.success(`${label} copied!`, {
        description: address,
      }),
    () => toast.error("Couldn't copy — please copy it manually."),
  );
}

export function CopyIp() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => copyAddress(site.serverAddress, "Java IP")}
        className="glass group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs shadow-soft transition hover:bg-card sm:text-sm"
      >
        <span className="rounded bg-primary/50 px-1.5 py-0.5 font-sans text-[10px] font-bold text-ink">JAVA</span>
        {site.serverAddress}
        <Copy className="size-3.5 text-ink transition-transform group-hover:scale-110" />
        <span className="sr-only">Copy Java server address</span>
      </button>
      <button
        type="button"
        onClick={() =>
          copyAddress(
            `${site.bedrockAddress}:${site.bedrockPort}`,
            "Bedrock IP",
          )
        }
        className="glass group inline-flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs shadow-soft transition hover:bg-card sm:text-sm"
      >
        <span className="rounded bg-sky px-1.5 py-0.5 font-sans text-[10px] font-bold text-ink">BEDROCK</span>
        {site.bedrockAddress}:{site.bedrockPort}
        <Copy className="size-3.5 text-ink transition-transform group-hover:scale-110" />
        <span className="sr-only">Copy Bedrock server address and port</span>
      </button>
    </div>
  );
}

export function ServerStatus() {
  return (
    <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-glow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg">Server status</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">
          <Wifi className="size-3.5" />
          Active
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
        <span className="truncate font-mono text-sm">{site.serverAddress}</span>
        <Button size="sm" variant="soft" onClick={copyAddress}>
          <Copy /> Copy
        </Button>
      </div>
    </div>
  );
}
