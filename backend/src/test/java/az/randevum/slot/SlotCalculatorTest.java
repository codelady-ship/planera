package az.randevum.slot;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.config.TimeConfig;
import az.randevum.slot.SlotCalculator.Busy;
import az.randevum.slot.SlotCalculator.Window;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class SlotCalculatorTest {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);
    private static final Instant EARLIER = Instant.parse("2026-10-01T00:00:00Z");
    private static final List<Window> WITH_LUNCH = List.of(window("09:00", "13:00"), window("14:00", "18:00"));

    private static Window window(String start, String end) {
        return new Window(LocalTime.parse(start), LocalTime.parse(end));
    }

    private static Instant at(String time) {
        return MONDAY.atTime(LocalTime.parse(time)).atZone(TimeConfig.BAKU).toInstant();
    }

    private static List<String> free(List<Window> windows, int duration, int step, List<Busy> busy, Instant now) {
        return SlotCalculator.freeStarts(MONDAY, windows, duration, step, busy, now, TimeConfig.BAKU).stream()
                .map(LocalTime::toString)
                .toList();
    }

    @Test
    void breakSplitsTheDayAndServiceMustFitBeforeIt() {
        List<String> slots = free(WITH_LUNCH, 60, 30, List.of(), EARLIER);
        assertThat(slots).containsExactly(
                "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00",
                "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00");
    }

    @Test
    void serviceLongerThanTheIntervalHasNoSlot() {
        assertThat(free(List.of(window("10:00", "11:00")), 90, 15, List.of(), EARLIER)).isEmpty();
    }

    @Test
    void appointmentsBlockOverlappingStartsButNotTouchingOnes() {
        List<Busy> busy = List.of(new Busy(at("10:00"), at("10:30")));
        assertThat(free(List.of(window("09:00", "11:00")), 30, 15, busy, EARLIER))
                .containsExactly("09:00", "09:15", "09:30", "10:30");
    }

    @Test
    void fullyBookedDayHasNoSlots() {
        List<Busy> busy = List.of(new Busy(at("09:00"), at("13:00")), new Busy(at("14:00"), at("18:00")));
        assertThat(free(WITH_LUNCH, 30, 15, busy, EARLIER)).isEmpty();
    }

    @Test
    void dayOffHasNoWindowsAndNoSlots() {
        assertThat(free(List.of(), 30, 15, List.of(), EARLIER)).isEmpty();
    }

    @Test
    void pastTimesOfTodayAreSkipped() {
        assertThat(free(List.of(window("09:00", "11:00")), 30, 30, List.of(), at("09:40")))
                .containsExactly("10:00", "10:30");
    }

    @Test
    void intervalEndingAtMidnightDoesNotWrap() {
        assertThat(free(List.of(window("22:00", "23:59")), 60, 60, List.of(), EARLIER)).containsExactly("22:00");
    }
}
