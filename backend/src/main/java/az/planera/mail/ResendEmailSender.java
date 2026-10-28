package az.planera.mail;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.ObjectMapper;

/**
 * Sends through Resend's HTTP API (#43): one POST per message with the key
 * from {@code RESEND_API_KEY}. Failures are logged and reported as false;
 * an e-mail never breaks a booking.
 */
public class ResendEmailSender implements EmailSender {

    static final URI ENDPOINT = URI.create("https://api.resend.com/emails");

    private static final Logger log = LoggerFactory.getLogger(ResendEmailSender.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final String apiKey;
    private final String from;
    private final ObjectMapper json;
    private final HttpClient http;

    public ResendEmailSender(String apiKey, String from, ObjectMapper json) {
        this.apiKey = apiKey;
        this.from = from;
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    }

    @Override
    public boolean send(EmailMessage message) {
        String body = json.writeValueAsString(Map.of(
                "from", from,
                "to", List.of(message.to()),
                "subject", message.subject(),
                "text", message.text()));
        HttpRequest request = HttpRequest.newBuilder(ENDPOINT)
                .timeout(TIMEOUT)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        try {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return true;
            }
            log.warn("Resend answered {} for an e-mail to {}: {}", response.statusCode(), message.to(), response.body());
        } catch (IOException e) {
            log.warn("Resend unreachable for an e-mail to {}: {}", message.to(), e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return false;
    }
}
