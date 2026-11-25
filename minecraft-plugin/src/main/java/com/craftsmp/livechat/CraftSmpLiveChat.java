package com.craftsmp.livechat;

import com.google.gson.JsonObject;
import io.papermc.paper.event.player.AsyncChatEvent;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import org.bukkit.Bukkit;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

public final class CraftSmpLiveChat extends JavaPlugin implements Listener {
  private static final int MAX_MESSAGE_LENGTH = 256;
  private final ConcurrentHashMap<UUID, Long> lastMessageNanos = new ConcurrentHashMap<>();
  private final AtomicBoolean failureLogged = new AtomicBoolean();
  private HttpClient httpClient;
  private String apiUrl;
  private String token;
  private Duration requestTimeout;
  private long cooldownNanos;

  @Override
  public void onEnable() {
    saveDefaultConfig();
    apiUrl = getConfig().getString("chat.api-url", "").replaceAll("/+$", "");
    token = getConfig().getString("chat.token", "").trim();
    int timeoutSeconds = getConfig().getInt("chat.request-timeout-seconds", 8);
    int cooldownMillis = getConfig().getInt(
        "chat.per-player-cooldown-milliseconds",
        750);

    if (apiUrl.isBlank()
        || token.isBlank()
        || token.equals("MINECRAFT_PLUGIN_TOKEN")
        || timeoutSeconds < 1
        || cooldownMillis < 250) {
      getLogger().severe(
          "Set a real chat.token and HTTPS chat.api-url, a positive timeout, and a per-player cooldown of at least 250ms in config.yml.");
      getServer().getPluginManager().disablePlugin(this);
      return;
    }

    try {
      URI uri = URI.create(apiUrl);
      if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
        throw new IllegalArgumentException("HTTPS is required.");
      }
    } catch (IllegalArgumentException exception) {
      getLogger().log(Level.SEVERE, "chat.api-url is not a valid HTTPS URL.", exception);
      getServer().getPluginManager().disablePlugin(this);
      return;
    }

    requestTimeout = Duration.ofSeconds(timeoutSeconds);
    cooldownNanos = Duration.ofMillis(cooldownMillis).toNanos();
    httpClient = HttpClient.newBuilder()
        .connectTimeout(requestTimeout)
        .build();
    getServer().getPluginManager().registerEvents(this, this);
    getLogger().info("Live server chat forwarding is enabled.");
  }

  @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
  public void onPlayerChat(AsyncChatEvent event) {
    String message = PlainTextComponentSerializer.plainText()
        .serialize(event.message())
        .strip();
    if (message.isEmpty()
        || message.codePointCount(0, message.length()) > MAX_MESSAGE_LENGTH
        || message.codePoints().anyMatch(Character::isISOControl)) {
      return;
    }

    UUID playerId = event.getPlayer().getUniqueId();
    String playerName = event.getPlayer().getName();
    if (!acceptMessage(playerId)) {
      return;
    }

    Bukkit.getScheduler().runTaskAsynchronously(
        this,
        () -> forwardMessage(playerName, message));
  }

  @EventHandler
  public void onPlayerQuit(PlayerQuitEvent event) {
    lastMessageNanos.remove(event.getPlayer().getUniqueId());
  }

  private boolean acceptMessage(UUID playerId) {
    long now = System.nanoTime();
    AtomicBoolean accepted = new AtomicBoolean();
    lastMessageNanos.compute(playerId, (ignored, previous) -> {
      if (previous == null || now - previous >= cooldownNanos) {
        accepted.set(true);
        return now;
      }
      return previous;
    });
    return accepted.get();
  }

  private void forwardMessage(String playerName, String message) {
    JsonObject body = new JsonObject();
    body.addProperty("playerName", playerName);
    body.addProperty("message", message);

    HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(apiUrl + "/api/game/chat"))
        .timeout(requestTimeout)
        .header("Authorization", "Bearer " + token)
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body.toString(), StandardCharsets.UTF_8))
        .build();

    try {
      HttpResponse<Void> response = httpClient.send(
          request,
          HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() != 201) {
        logForwardFailure("HTTP " + response.statusCode());
      }
    } catch (IOException | InterruptedException exception) {
      if (exception instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
      logForwardFailure(exception.getMessage());
    }
  }

  private void logForwardFailure(String detail) {
    if (failureLogged.compareAndSet(false, true)) {
      getLogger().log(
          Level.WARNING,
          "Could not forward live chat to the website: " + detail);
      Bukkit.getScheduler().runTaskLaterAsynchronously(
          this,
          () -> failureLogged.set(false),
          20L * 60L);
    }
  }
}
