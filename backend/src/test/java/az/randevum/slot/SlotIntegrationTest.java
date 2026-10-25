package az.randevum.slot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.randevum.TestcontainersConfiguration;
import az.randevum.availability.AvailabilityDtos.RuleRequest;
import az.randevum.availability.AvailabilityDtos.TimeOffRequest;
import az.randevum.availability.AvailabilityService;
import az.randevum.common.BusinessRuleException;
import az.randevum.config.TimeConfig;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.domain.ServiceOffering;
import az.randevum.domain.ServiceOfferingRepository;
import az.randevum.redis.RedisSupport;
import az.randevum.redis.SlotCache;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZonedDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Slots and schedule rules against the demo data, with "now" fixed to Monday 26 Oct 2026, 10:10 (#17, #19). */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, SlotService.class, SlotCache.class, RedisSupport.class, AvailabilityService.class, SlotIntegrationTest.FixedClock.class})
@ActiveProfiles("dev")
class SlotIntegrationTest {

    static final LocalDate MONDAY = LocalDate.of(2026, 10, 26);

    @TestConfiguration
    static class FixedClock {
        @Bean
        Clock clock() {
            return Clock.fixed(ZonedDateTime.of(MONDAY, LocalTime.of(10, 10), TimeConfig.BAKU).toInstant(), TimeConfig.BAKU);
        }
    }

    @Autowired SlotService slots;
    @Autowired AvailabilityService availability;
    @Autowired ProviderProfileRepository providers;
    @Autowired ServiceOfferingRepository services;

    Long barberId;
    ServiceOffering haircut;

    @BeforeEach
    void setUp() {
        barberId = providers.findBySlugAndActiveTrue("elvin-barber").orElseThrow().getId();
        haircut = services.findByProviderIdAndActiveTrueOrderByPriceAsc(barberId).getFirst();
    }

    @Test
    void todayStartsAfterNowAndSkipsTheLunchBreak() {
        List<String> today = slots.slots("elvin-barber", haircut.getId(), MONDAY).slots();
        assertThat(today.getFirst()).isEqualTo("10:15");
        assertThat(today).doesNotContain("13:00", "13:30").contains("14:00");
    }

    @Test
    void availableDatesSkipSundaysAndPastDays() {
        List<LocalDate> dates = slots.availableDates("elvin-barber", haircut.getId(), YearMonth.of(2026, 10)).dates();
        assertThat(dates).containsExactly(MONDAY, MONDAY.plusDays(1), MONDAY.plusDays(2), MONDAY.plusDays(3),
                MONDAY.plusDays(4), MONDAY.plusDays(5));
    }

    @Test
    void timeOffClosesTheDay() {
        LocalDate tuesday = MONDAY.plusDays(1);
        availability.addTimeOff(barberId, new TimeOffRequest(tuesday, tuesday, "Bayram"));
        assertThat(slots.slots("elvin-barber", haircut.getId(), tuesday).slots()).isEmpty();
        assertThatThrownBy(() -> availability.addTimeOff(barberId, new TimeOffRequest(tuesday, tuesday.plusDays(2), null)))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void overlappingRulesAreRejectedAndValidOnesReplaceTheWeek() {
        assertThatThrownBy(() -> availability.replaceWeekly(barberId, List.of(
                        new RuleRequest(1, LocalTime.of(9, 0), LocalTime.of(12, 0)),
                        new RuleRequest(1, LocalTime.of(11, 0), LocalTime.of(15, 0)))))
                .isInstanceOf(BusinessRuleException.class);

        var view = availability.replaceWeekly(barberId, List.of(new RuleRequest(2, LocalTime.of(12, 0), LocalTime.of(13, 0))));
        assertThat(view.weekly().get(0).intervals()).isEmpty();
        assertThat(view.weekly().get(1).intervals()).hasSize(1);
        assertThat(slots.slots("elvin-barber", haircut.getId(), MONDAY).slots()).isEmpty();
    }

    @Test
    void datesBeyondTheHorizonHaveNoSlots() {
        assertThat(slots.slots("elvin-barber", haircut.getId(), MONDAY.plusDays(SlotService.HORIZON_DAYS + 1)).slots())
                .isEmpty();
    }
}
