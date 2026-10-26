package az.planera.slot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import az.planera.availability.AvailabilityController;
import az.planera.availability.AvailabilityService;
import az.planera.common.BusinessRuleException;
import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.slot.SlotService.AvailableDatesView;
import az.planera.slot.SlotService.SlotsView;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest({SlotController.class, AvailabilityController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class SlotControllerTest {

    @Autowired MockMvcTester mvc;

    @MockitoBean SlotService slots;
    @MockitoBean AvailabilityService availability;

    @Test
    void slotsArePublic() {
        LocalDate date = LocalDate.of(2026, 10, 27);
        given(slots.slots("elvin-barber", 1L, date)).willReturn(new SlotsView(date, 1L, 30, List.of("09:00", "09:15")));

        assertThat(mvc.get().uri("/api/providers/elvin-barber/slots?serviceId=1&date=2026-10-27"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.slots[1]")
                .isEqualTo("09:15");
    }

    @Test
    void availableDatesBindTheMonth() {
        given(slots.availableDates(eq("elvin-barber"), eq(1L), eq(YearMonth.of(2026, 10))))
                .willReturn(new AvailableDatesView(YearMonth.of(2026, 10), 1L, List.of(LocalDate.of(2026, 10, 27))));

        assertThat(mvc.get().uri("/api/providers/elvin-barber/available-dates?serviceId=1&month=2026-10"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.dates[0]")
                .isEqualTo("2026-10-27");
    }

    @Test
    void scheduleChangesNeedTheAdminRole() {
        assertThat(mvc.put().uri("/api/admin/providers/1/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rules\":[]}"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void overlappingRulesAreA422Problem() {
        given(availability.replaceWeekly(any(), anyList())).willThrow(new BusinessRuleException("İş saatları kəsişir"));

        assertThat(mvc.put().uri("/api/admin/providers/1/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rules\":[{\"day\":1,\"start\":\"09:00\",\"end\":\"12:00\"}]}"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT)
                .bodyJson()
                .extractingPath("$.detail")
                .isEqualTo("İş saatları kəsişir");
    }
}
