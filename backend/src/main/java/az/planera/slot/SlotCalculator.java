package az.planera.slot;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure slot arithmetic (#18), free of Spring and JPA so it is unit-tested
 * directly. A start time is free when the whole service fits inside one
 * working interval, does not overlap a busy range and lies in the future.
 * Breaks are the gaps between working intervals.
 */
public final class SlotCalculator {

    private SlotCalculator() {}

    /** A working interval of the day in local time. */
    public record Window(LocalTime start, LocalTime end) {}

    /** A taken range, half-open [start, end) like the database constraint. */
    public record Busy(Instant start, Instant end) {}

    public static List<LocalTime> freeStarts(
            LocalDate date,
            List<Window> windows,
            int durationMinutes,
            int stepMinutes,
            List<Busy> busy,
            Instant now,
            ZoneId zone) {
        List<LocalTime> free = new ArrayList<>();
        for (Window w : windows) {
            // Minutes of the day, so an interval ending near midnight cannot wrap around.
            int end = w.end().toSecondOfDay() / 60;
            for (int t = w.start().toSecondOfDay() / 60; t + durationMinutes <= end; t += stepMinutes) {
                LocalTime time = LocalTime.ofSecondOfDay(t * 60L);
                Instant start = date.atTime(time).atZone(zone).toInstant();
                Instant finish = start.plusSeconds(durationMinutes * 60L);
                if (start.isAfter(now) && busy.stream().noneMatch(b -> start.isBefore(b.end()) && finish.isAfter(b.start()))) {
                    free.add(time);
                }
            }
        }
        return free;
    }
}
