package az.randevum.push;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class PushDtos {

    private PushDtos() {}

    /** The {@code keys} object of the browser's {@code PushSubscription.toJSON()}. */
    public record Keys(@NotBlank @Size(max = 255) String p256dh, @NotBlank @Size(max = 255) String auth) {}

    public record SubscribeRequest(
            @NotBlank @Size(max = 2000) String endpoint,
            @NotNull @Valid Keys keys,
            @Size(max = 200) String device) {}

    public record SubscriptionView(Long id, String device, Instant createdAt) {}

    /** The VAPID public key, base64url, for {@code pushManager.subscribe}. */
    public record PublicKeyView(String publicKey) {}

    /** How many of the user's devices accepted a message. */
    public record DeliveryView(int delivered) {}
}
