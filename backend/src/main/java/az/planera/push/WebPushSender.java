package az.planera.push;

import az.planera.domain.PushSubscription;
import com.zerodeplibs.webpush.httpclient.StandardHttpClientRequestPreparer;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Sends Web Push messages with the JDK HTTP client: the payload is encrypted
 * for the subscription (RFC 8291) and the request carries a VAPID JWT
 * (RFC 8292). Network and encoding problems never throw; they come back as
 * a status the caller can act on.
 */
@Component
public class WebPushSender implements PushSender {

    static final int UNREACHABLE = 0;
    static final int GONE = 410;

    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);
    private static final Pattern TOPIC = Pattern.compile("^[A-Za-z0-9_-]{1,32}$");
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final VapidKeys vapid;
    private final ObjectMapper json;
    private final HttpClient http;

    public WebPushSender(VapidKeys vapid, ObjectMapper json) {
        this.vapid = vapid;
        this.json = json;
        this.http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
    }

    @Override
    public int send(PushSubscription subscription, PushMessage message) {
        HttpRequest request;
        try {
            request = prepare(subscription, message);
        } catch (RuntimeException e) {
            // Keys the browser gave us cannot be used: the subscription is as good as gone.
            log.warn("Push subscription {} has unusable keys: {}", subscription.getId(), e.getMessage());
            return GONE;
        }
        try {
            return http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
        } catch (IOException e) {
            log.warn("Push service unreachable for subscription {}: {}", subscription.getId(), e.getMessage());
            return UNREACHABLE;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return UNREACHABLE;
        }
    }

    private HttpRequest prepare(PushSubscription subscription, PushMessage message) {
        com.zerodeplibs.webpush.PushSubscription target = new com.zerodeplibs.webpush.PushSubscription();
        target.setEndpoint(subscription.getEndpoint());
        com.zerodeplibs.webpush.PushSubscription.Keys keys = new com.zerodeplibs.webpush.PushSubscription.Keys();
        keys.setP256dh(subscription.getP256dh());
        keys.setAuth(subscription.getAuth());
        target.setKeys(keys);

        var builder = StandardHttpClientRequestPreparer.getBuilder()
                .pushSubscription(target)
                .vapidJWTExpiresAfter(15, TimeUnit.MINUTES)
                .vapidJWTSubject(vapid.subject())
                .pushMessage(json.writeValueAsString(message))
                .ttl(1, TimeUnit.HOURS)
                .urgencyNormal();
        if (message.tag() != null && TOPIC.matcher(message.tag()).matches()) {
            builder.topic(message.tag());
        }
        return builder.build(vapid.keyPair()).toRequestBuilder().timeout(TIMEOUT).build();
    }
}
