package az.planera.push;

import az.planera.common.BusinessRuleException;
import az.planera.common.NotFoundException;
import az.planera.domain.PushSubscription;
import az.planera.domain.PushSubscriptionRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.push.PushDtos.DeliveryView;
import az.planera.push.PushDtos.SubscribeRequest;
import az.planera.push.PushDtos.SubscriptionView;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Push subscriptions per device and delivery to all of a user's devices
 * (#55). A subscription the push service reports as gone (404, 410) is
 * deleted; reminders (#56) call {@link #sendToUser}.
 */
@Service
@Transactional
public class PushService {

    /** Devices per account (#81): enough for phones and laptops, not for abuse. */
    static final int MAX_DEVICES = 20;

    private static final Logger log = LoggerFactory.getLogger(PushService.class);

    private final PushSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final PushSender sender;
    private final VapidKeys vapid;

    public PushService(
            PushSubscriptionRepository subscriptions, UserRepository users, PushSender sender, VapidKeys vapid) {
        this.subscriptions = subscriptions;
        this.users = users;
        this.sender = sender;
        this.vapid = vapid;
    }

    public String publicKey() {
        return vapid.publicKey();
    }

    @Transactional(readOnly = true)
    public List<SubscriptionView> list(String email) {
        return subscriptions.findByUserIdOrderByCreatedAtAsc(user(email).getId()).stream()
                .map(PushService::view)
                .toList();
    }

    /** The same endpoint subscribed again (new keys or another account) updates the row. */
    public SubscriptionView subscribe(String email, SubscribeRequest request) {
        User user = user(email);
        if (subscriptions.findByEndpoint(request.endpoint()).isEmpty()
                && subscriptions.findByUserIdOrderByCreatedAtAsc(user.getId()).size() >= MAX_DEVICES) {
            throw new BusinessRuleException("Bir hesabda ən çox " + MAX_DEVICES + " cihaz ola bilər");
        }
        PushSubscription subscription = subscriptions
                .findByEndpoint(request.endpoint())
                .map(existing -> {
                    existing.renew(user, request.keys().p256dh(), request.keys().auth(), request.device());
                    return existing;
                })
                .orElseGet(() -> subscriptions.save(new PushSubscription(
                        user, request.endpoint(), request.keys().p256dh(), request.keys().auth(), request.device())));
        return view(subscription);
    }

    /** Idempotent: an endpoint that is already gone is fine. */
    public void unsubscribe(String email, String endpoint) {
        subscriptions.deleteByUserIdAndEndpoint(user(email).getId(), endpoint);
    }

    /** Sends to every device of the user and returns how many accepted. */
    public int sendToUser(Long userId, PushMessage message) {
        int delivered = 0;
        for (PushSubscription subscription : subscriptions.findByUserIdOrderByCreatedAtAsc(userId)) {
            int status = sender.send(subscription, message);
            if (status == 404 || status == 410) {
                log.info("Push subscription {} is gone ({}), removing it", subscription.getId(), status);
                subscriptions.delete(subscription);
            } else if (status >= 200 && status < 300) {
                delivered++;
            } else {
                log.warn("Push to subscription {} answered {}", subscription.getId(), status);
            }
        }
        return delivered;
    }

    public DeliveryView sendTest(String email) {
        User user = user(email);
        if (subscriptions.findByUserIdOrderByCreatedAtAsc(user.getId()).isEmpty()) {
            throw new BusinessRuleException("Bu hesabda bildiriş abunəliyi yoxdur");
        }
        PushMessage message = new PushMessage(
                "Planera", "Bildirişlər işləyir. Xatırlatmalar bu cihaza gələcək.", "/account", "test");
        return new DeliveryView(sendToUser(user.getId(), message));
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("İstifadəçi tapılmadı"));
    }

    private static SubscriptionView view(PushSubscription s) {
        return new SubscriptionView(s.getId(), s.getDevice(), s.getCreatedAt());
    }
}
