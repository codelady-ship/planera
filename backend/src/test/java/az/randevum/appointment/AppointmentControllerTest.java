package az.randevum.appointment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import az.randevum.appointment.AppointmentDtos.Scope;
import az.randevum.common.BusinessRuleException;
import az.randevum.common.SlotTakenException;
import az.randevum.common.TooManyRequestsException;
import az.randevum.config.SecurityConfig;
import az.randevum.domain.AppointmentStatus;
import java.time.Duration;
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

@WebMvcTest(AppointmentController.class)
@Import(SecurityConfig.class)
class AppointmentControllerTest {

    private static final String BOOKING = "{\"serviceId\":1,\"date\":\"2026-10-27\",\"time\":\"10:00\"}";

    @Autowired MockMvcTester mvc;

    @MockitoBean AppointmentService appointments;

    @Test
    void bookingRequiresAuthentication() {
        assertThat(mvc.post().uri("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(BOOKING))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(mvc.get().uri("/api/me/appointments")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void takenSlotIsA409WithAlternatives() {
        given(appointments.create(argThat(a -> a.email().equals("musteri@randevum.az") && !a.admin()), any()))
                .willThrow(new SlotTakenException(List.of("10:30", "11:00")));

        assertThat(mvc.post().uri("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(BOOKING))
                .hasStatus(HttpStatus.CONFLICT)
                .bodyJson()
                .extractingPath("$.alternatives[0]")
                .isEqualTo("10:30");
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void rateLimitIsA429WithRetryAfter() {
        given(appointments.create(any(), any()))
                .willThrow(new TooManyRequestsException("Çox sayda sorğu", Duration.ofMinutes(1)));

        assertThat(mvc.post().uri("/api/appointments").contentType(MediaType.APPLICATION_JSON).content(BOOKING))
                .hasStatus(HttpStatus.TOO_MANY_REQUESTS)
                .hasHeader("Retry-After", "60");
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void bookingWithoutServiceIsA400() {
        assertThat(mvc.post().uri("/api/appointments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"2026-10-27\",\"time\":\"10:00\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors.serviceId")
                .isNotNull();
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void scopeIsCaseInsensitive() {
        given(appointments.mine(any(), eq(Scope.CANCELLED))).willReturn(List.of());

        assertThat(mvc.get().uri("/api/me/appointments?scope=cancelled")).hasStatusOk();
        assertThat(mvc.get().uri("/api/me/appointments?scope=nonsense")).hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void onlyAdminsChangeStatus() {
        assertThat(mvc.patch().uri("/api/admin/appointments/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void wrongTransitionIsA422() {
        given(appointments.changeStatus(1L, AppointmentStatus.CONFIRMED))
                .willThrow(new BusinessRuleException("Status CANCELLED -> CONFIRMED keçidinə icazə yoxdur"));

        assertThat(mvc.patch().uri("/api/admin/appointments/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
    }
}
