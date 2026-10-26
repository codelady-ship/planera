package az.planera.redis;

import java.time.Duration;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.stereotype.Component;

/**
 * Free slots of one provider day (#77). One hash per day,
 * {@code slots:{providerId}:{date}}, with a field per service, so a booking
 * drops every service of that day with a single DEL. Entries live 60 seconds.
 */
@Component
public class SlotCache {

    static final Duration TTL = Duration.ofSeconds(60);

    private final RedisSupport redis;

    public SlotCache(RedisSupport redis) {
        this.redis = redis;
    }

    static String key(Long providerId, LocalDate date) {
        return "slots:" + providerId + ":" + date;
    }

    public Optional<List<String>> get(Long providerId, Long serviceId, LocalDate date) {
        String value = redis.call(r -> (String) r.opsForHash().get(key(providerId, date), serviceId.toString()), null);
        if (value == null) {
            return Optional.empty();
        }
        return Optional.of(value.isEmpty() ? List.of() : Arrays.asList(value.split(",")));
    }

    public void put(Long providerId, Long serviceId, LocalDate date, List<String> slots) {
        String key = key(providerId, date);
        redis.run(r -> {
            r.opsForHash().put(key, serviceId.toString(), String.join(",", slots));
            r.expire(key, TTL);
        });
    }

    /** After a booking, cancellation or reschedule on that day. */
    public void evictDay(Long providerId, LocalDate date) {
        redis.run(r -> r.delete(key(providerId, date)));
    }

    /** After a schedule change, which may touch any day. */
    public void evictProvider(Long providerId) {
        redis.run(r -> {
            ScanOptions pattern = ScanOptions.scanOptions().match("slots:" + providerId + ":*").count(100).build();
            try (Cursor<String> keys = r.scan(pattern)) {
                keys.forEachRemaining(r::delete);
            }
        });
    }
}
