package az.randevum.reminder;

import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.config.TimeConfig;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import org.junit.jupiter.api.Test;

/** Alarm wording in Baku time, relative to a fixed clock (#56, #62). */
class ReminderTextTest {

    static final Clock MONDAY_10_10 = Clock.fixed(
            ZonedDateTime.of(LocalDate.of(2026, 10, 26), LocalTime.of(10, 10), TimeConfig.BAKU).toInstant(),
            TimeConfig.BAKU);

    static Instant baku(int day, int hour, int minute) {
        return ZonedDateTime.of(LocalDate.of(2026, 10, day), LocalTime.of(hour, minute), TimeConfig.BAKU).toInstant();
    }

    @Test
    void todayTomorrowAndADate() {
        assertThat(ReminderService.body(baku(26, 15, 0), "Elvin Məmmədov", "Saç kəsimi", MONDAY_10_10))
                .isEqualTo("Sizin bu gün saat 15:00-da Elvin Məmmədov ilə randevunuz var: Saç kəsimi");
        assertThat(ReminderService.body(baku(27, 9, 30), "Elvin Məmmədov", "Saç kəsimi", MONDAY_10_10))
                .isEqualTo("Sizin sabah saat 09:30-da Elvin Məmmədov ilə randevunuz var: Saç kəsimi");
        assertThat(ReminderService.body(baku(30, 18, 0), "Dr. Leyla Hüseynova", "Konsultasiya", MONDAY_10_10))
                .isEqualTo("Sizin 30 oktyabr saat 18:00-da Dr. Leyla Hüseynova ilə randevunuz var: Konsultasiya");
    }

    @Test
    void personalNotesHaveTheirOwnSentence() {
        assertThat(ReminderService.noteBody(baku(26, 15, 0), "həkimə getmək", MONDAY_10_10))
                .isEqualTo("Sizin bu gün saat 15:00-da qeydiniz var: həkimə getmək");
    }

    @Test
    void theDayIsJudgedInBakuEvenWhenTheClockIsUtc() {
        // 23:30 UTC on Monday is already 03:30 Tuesday in Baku.
        Clock utcLateMonday = Clock.fixed(Instant.parse("2026-10-26T23:30:00Z"), java.time.ZoneOffset.UTC);
        assertThat(ReminderService.noteBody(baku(27, 9, 0), "idman", utcLateMonday)).startsWith("Sizin bu gün");
    }
}
