package az.planera.appointment;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.appointment.AppointmentDtos.AppointmentView;
import az.planera.appointment.AppointmentDtos.ProviderAppointmentView;
import az.planera.domain.AppointmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** The public demo admin sees the calendar, never who the customers are. */
class DemoAnonymizationTest {

    private static ProviderAppointmentView item(String name) {
        AppointmentView view = new AppointmentView(1L, "RV-2026-000001", "elvin-barber", "Elvin Məmmədov", 2L,
                "Saç kəsimi", LocalDate.of(2026, 11, 18), "10:00", 30, Instant.EPOCH, Instant.EPOCH.plusSeconds(1800),
                AppointmentStatus.CONFIRMED, new BigDecimal("15.00"), "Zəng edin: +994501112233", false, false);
        return new ProviderAppointmentView(view, name, "+994501112233");
    }

    @Test
    void keepsFirstNameAndLastInitialOnly() {
        ProviderAppointmentView masked = item("Aynur  Qasımova").anonymized();
        assertThat(masked.customerName()).isEqualTo("Aynur Q.");
        assertThat(masked.customerPhone()).isNull();
        assertThat(masked.appointment().note()).isNull();
        assertThat(masked.appointment().serviceName()).isEqualTo("Saç kəsimi");
    }

    @Test
    void handlesSingleAndMissingNames() {
        assertThat(item("Aynur").anonymized().customerName()).isEqualTo("Aynur");
        assertThat(item(null).anonymized().customerName()).isEqualTo("-");
    }
}
