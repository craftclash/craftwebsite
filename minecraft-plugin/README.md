# Craft SMP Live Chat

This standalone Paper plugin forwards public in-game chat to the Craft SMP
website's read-only chat feed. It targets Paper 26.3 and Java 25.

## Build

From this directory, run:

```powershell
gradle build
```

The plugin jar is created at
`build/libs/craft-smp-live-chat-1.0.0.jar`. Install it in the server's
`plugins` directory and start Paper once to generate its configuration.

## Configure

Edit `plugins/CraftSmpLiveChat/config.yml`:

```yaml
chat:
  api-url: "https://store.craftsmp.cc"
  token: "the-same-random-secret-as-MINECRAFT_PLUGIN_TOKEN"
  request-timeout-seconds: 8
  per-player-cooldown-milliseconds: 750
```

Set `MINECRAFT_PLUGIN_TOKEN` in the website's server-only environment to the
same strong random secret. Never commit the secret, expose it to browsers, or
put a Supabase key in this plugin. The website also needs
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` configured server-side.

Apply the server chat migration before enabling the plugin. The plugin
submits uncancelled Paper chat events over HTTPS, strips formatting, limits
each message to 256 characters, and applies a per-player forwarding cooldown.
It never changes or broadcasts messages in-game. Messages are shown on the
website's `/chat` page and are read-only there. Messages older than seven days
are pruned when a new message is received.

If the website is unavailable, the plugin logs a rate-limited warning and
continues normal in-game chat; failed messages are not retried.
