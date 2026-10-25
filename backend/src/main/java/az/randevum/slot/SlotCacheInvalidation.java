package az.randevum.slot;

import az.randevum.availability.AvailabilityService.AvailabilityChanged;
import az.randevum.redis.SlotCache;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Drops a provider's cached slots once a schedule change has committed (#77). */
@Component
class SlotCacheInvalidation {

    private final SlotCache cache;

    SlotCacheInvalidation(SlotCache cache) {
        this.cache = cache;
    }

    @TransactionalEventListener(fallbackExecution = true)
    void onAvailabilityChanged(AvailabilityChanged event) {
        cache.evictProvider(event.providerId());
    }
}
