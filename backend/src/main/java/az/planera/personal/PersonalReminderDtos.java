package az.planera.personal;

import az.planera.domain.PersonalReminder.Source;
import az.planera.domain.PersonalReminder.Status;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class PersonalReminderDtos {

    private PersonalReminderDtos() {}

    /** Date and time are Baku local, like appointments. */
    public record ReminderView(
            Long id,
            String title,
            String note,
            LocalDate date,
            String time,
            Instant startsAt,
            List<Integer> reminderOffsets,
            Source source,
            Status status) {}

    /** {@code reminderOffsets} default to [0] (at the start); {@code source} to MANUAL. */
    public record CreateRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 2000) String note,
            @NotNull LocalDate date,
            @NotNull LocalTime time,
            @Size(max = 4) List<Integer> reminderOffsets,
            Source source) {}

    /** Every field optional: only the given ones change. */
    public record UpdateRequest(
            @Size(min = 1, max = 200) String title,
            @Size(max = 2000) String note,
            LocalDate date,
            LocalTime time,
            @Size(max = 4) List<Integer> reminderOffsets,
            Status status) {}

    /** One line of the diary: an appointment or a personal note, by time. */
    public record AgendaItem(
            String type,
            Long id,
            Instant startsAt,
            LocalDate date,
            String time,
            String title,
            String subtitle,
            String status) {

        public static final String APPOINTMENT = "APPOINTMENT";
        public static final String NOTE = "NOTE";
    }
}
