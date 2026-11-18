package az.planera.appointment;

import az.planera.domain.AppointmentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public final class AppointmentDtos {

    private AppointmentDtos() {}

    /** Who is calling; filled from the authenticated principal (email, roles). */
    public record Actor(String email, boolean admin) {}

    /** Date and time are local to Asia/Baku, exactly as the slots endpoint returns them. */
    public record CreateRequest(
            @NotNull Long serviceId,
            @NotNull LocalDate date,
            @NotNull LocalTime time,
            @Size(max = 500) String note) {}

    public record RescheduleRequest(@NotNull LocalDate date, @NotNull LocalTime time) {}

    public record CancelRequest(@Size(max = 255) String reason) {}

    public record StatusRequest(@NotNull AppointmentStatus status) {}

    public enum Scope {
        UPCOMING,
        PAST,
        CANCELLED
    }

    public record AppointmentView(
            Long id,
            String code,
            String providerSlug,
            String providerName,
            Long serviceId,
            String serviceName,
            LocalDate date,
            String time,
            int durationMinutes,
            Instant startsAt,
            Instant endsAt,
            AppointmentStatus status,
            BigDecimal price,
            String note,
            boolean cancellable,
            /** Completed and not reviewed yet (#44). */
            boolean reviewable) {

        /** The same appointment without the customer's free-text note. */
        public AppointmentView withoutNote() {
            return new AppointmentView(id, code, providerSlug, providerName, serviceId, serviceName, date, time,
                    durationMinutes, startsAt, endsAt, status, price, null, cancellable, reviewable);
        }
    }

    /** What a provider sees: the appointment plus who booked it. */
    public record ProviderAppointmentView(AppointmentView appointment, String customerName, String customerPhone) {

        /**
         * What a public demo account sees: first name and last initial, no phone
         * and no note, so real customers are never shown to demo visitors.
         */
        public ProviderAppointmentView anonymized() {
            String[] parts = customerName == null ? new String[0] : customerName.strip().split("\\s+");
            String name = parts.length == 0 || parts[0].isEmpty() ? "-"
                    : parts.length == 1 ? parts[0]
                    : parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
            return new ProviderAppointmentView(appointment.withoutNote(), name, null);
        }
    }
}
