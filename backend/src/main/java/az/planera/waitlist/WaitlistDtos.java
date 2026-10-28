package az.planera.waitlist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public final class WaitlistDtos {

    private WaitlistDtos() {}

    /** The provider, service and day the customer wants (#45). */
    public record JoinRequest(@NotBlank String slug, @NotNull Long serviceId, @NotNull LocalDate date) {}

    public record WaitlistView(
            Long id, String providerSlug, String providerName, Long serviceId, String serviceName, LocalDate date) {}
}
