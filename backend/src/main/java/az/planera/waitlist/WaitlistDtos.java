package az.planera.waitlist;

import az.planera.config.DemoSafe;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public final class WaitlistDtos {

    private WaitlistDtos() {}

    /** The provider, service and day the customer wants (#45). */
    public record JoinRequest(@NotBlank String slug, @NotNull Long serviceId, @NotNull LocalDate date) {}

    @DemoSafe("The caller's own waitlist entries.")
    public record WaitlistView(
            Long id, String providerSlug, String providerName, Long serviceId, String serviceName, LocalDate date) {}
}
