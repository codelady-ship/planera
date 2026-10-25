package az.randevum.availability;

import az.randevum.provider.ProviderDtos.DaySchedule;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class AvailabilityDtos {

    private AvailabilityDtos() {}

    /** One weekly working interval; ISO day (1 = Monday). Local times in Asia/Baku. */
    public record RuleRequest(
            @Min(1) @Max(7) int day,
            @NotNull LocalTime start,
            @NotNull LocalTime end) {}

    /** Replaces the whole weekly schedule; an empty list closes every day. */
    public record WeeklyRequest(@NotNull @Size(max = 50) List<@Valid RuleRequest> rules) {}

    public record TimeOffRequest(
            @NotNull LocalDate startsOn,
            @NotNull LocalDate endsOn,
            @Size(max = 255) String reason) {}

    public record TimeOffView(Long id, LocalDate startsOn, LocalDate endsOn, String reason) {}

    public record AvailabilityView(int slotStepMinutes, List<DaySchedule> weekly, List<TimeOffView> timeOff) {}
}
