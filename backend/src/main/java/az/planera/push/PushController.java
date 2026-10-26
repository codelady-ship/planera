package az.planera.push;

import az.planera.push.PushDtos.DeliveryView;
import az.planera.push.PushDtos.PublicKeyView;
import az.planera.push.PushDtos.SubscribeRequest;
import az.planera.push.PushDtos.SubscriptionView;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Web Push subscriptions of the signed-in user (#55). Every endpoint requires authentication. */
@RestController
public class PushController {

    private final PushService push;

    public PushController(PushService push) {
        this.push = push;
    }

    @GetMapping("/api/push/public-key")
    public PublicKeyView publicKey() {
        return new PublicKeyView(push.publicKey());
    }

    @GetMapping("/api/me/push-subscriptions")
    public List<SubscriptionView> list(Authentication auth) {
        return push.list(auth.getName());
    }

    @PostMapping("/api/me/push-subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    public SubscriptionView subscribe(Authentication auth, @Valid @RequestBody SubscribeRequest request) {
        return push.subscribe(auth.getName(), request);
    }

    @DeleteMapping("/api/me/push-subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(Authentication auth, @RequestParam String endpoint) {
        push.unsubscribe(auth.getName(), endpoint);
    }

    /** Sends a test notification to all of the user's devices. */
    @PostMapping("/api/me/push-subscriptions/test")
    public DeliveryView test(Authentication auth) {
        return push.sendTest(auth.getName());
    }
}
