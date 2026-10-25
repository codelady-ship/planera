package az.randevum.appointment;

import static az.randevum.domain.AppointmentStatus.CANCELLED;
import static az.randevum.domain.AppointmentStatus.COMPLETED;
import static az.randevum.domain.AppointmentStatus.CONFIRMED;
import static az.randevum.domain.AppointmentStatus.NO_SHOW;
import static az.randevum.domain.AppointmentStatus.PENDING;
import static org.assertj.core.api.Assertions.assertThat;

import az.randevum.domain.AppointmentStatus;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class AppointmentStatusTest {

    @Test
    void allowedTransitions() {
        assertThat(PENDING.canTransitionTo(CONFIRMED)).isTrue();
        assertThat(PENDING.canTransitionTo(CANCELLED)).isTrue();
        assertThat(CONFIRMED.canTransitionTo(CANCELLED)).isTrue();
        assertThat(CONFIRMED.canTransitionTo(COMPLETED)).isTrue();
        assertThat(CONFIRMED.canTransitionTo(NO_SHOW)).isTrue();
    }

    @Test
    void finalStatesAreFinalAndNothingGoesBack() {
        for (AppointmentStatus next : AppointmentStatus.values()) {
            assertThat(CANCELLED.canTransitionTo(next)).isFalse();
            assertThat(COMPLETED.canTransitionTo(next)).isFalse();
            assertThat(NO_SHOW.canTransitionTo(next)).isFalse();
        }
        assertThat(CONFIRMED.canTransitionTo(PENDING)).isFalse();
        assertThat(PENDING.canTransitionTo(COMPLETED)).isFalse();
        assertThat(Arrays.stream(AppointmentStatus.values()).filter(s -> s.canTransitionTo(s))).isEmpty();
    }
}
