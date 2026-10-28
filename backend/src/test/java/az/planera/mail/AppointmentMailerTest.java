package az.planera.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import az.planera.appointment.AppointmentChanged;
import az.planera.appointment.AppointmentChanged.Kind;
import az.planera.config.TimeConfig;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.Category;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ServiceOffering;
import az.planera.domain.User;
import az.planera.domain.UserRole;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Templates and triggers of the appointment e-mails (#43). */
class AppointmentMailerTest {

    static final Clock MONDAY_10_10 = Clock.fixed(
            ZonedDateTime.of(LocalDate.of(2026, 10, 26), LocalTime.of(10, 10), TimeConfig.BAKU).toInstant(),
            TimeConfig.BAKU);

    final List<EmailMessage> sent = new ArrayList<>();
    final AppointmentRepository appointments = mock(AppointmentRepository.class);
    final AppointmentMailer mailer = new AppointmentMailer(appointments, m -> sent.add(m), MONDAY_10_10, "https://planera-az.vercel.app/");

    static Appointment appointment(String locale) {
        User customer = new User("musteri@planera.az", "Aynur Qasımova", UserRole.CUSTOMER);
        customer.setLocale(locale);
        ProviderProfile barber = new ProviderProfile(new Category("gozellik", "Gözəllik"), "elvin-barber", "Elvin Məmmədov", "Bərbər", "Bakı");
        barber.setAddress("Nizami küç. 12");
        ServiceOffering haircut = new ServiceOffering(barber, "Saç kəsimi", new BigDecimal("15.00"), 30);
        Instant startsAt = ZonedDateTime.of(LocalDate.of(2026, 10, 30), LocalTime.of(18, 0), TimeConfig.BAKU).toInstant();
        return new Appointment("RV-TEST-1", barber, customer, haircut, startsAt, startsAt.plus(Duration.ofMinutes(30)));
    }

    @Test
    void confirmationInAzerbaijaniWithEveryDetail() {
        EmailMessage mail = mailer.compose(appointment("az"), "confirmed");

        assertThat(mail.to()).isEqualTo("musteri@planera.az");
        assertThat(mail.subject()).isEqualTo("Randevunuz qəbul olundu: Saç kəsimi, 30 oktyabr saat 18:00-da");
        assertThat(mail.text())
                .contains("Salam, Aynur Qasımova!")
                .contains("Elvin Məmmədov (Bərbər)")
                .contains("15.00 AZN")
                .contains("Nizami küç. 12")
                .contains("RV-TEST-1")
                .contains("https://planera-az.vercel.app/account");
    }

    @Test
    void cancellationAndReminderFollowTheCustomersLanguage() {
        assertThat(mailer.compose(appointment("en"), "cancelled").subject())
                .isEqualTo("Your appointment was cancelled: Saç kəsimi, on 30 October at 18:00");
        assertThat(mailer.compose(appointment("ru"), "reminder").subject())
                .isEqualTo("Напоминание о записи: Saç kəsimi, 30 октября в 18:00");
        assertThat(mailer.compose(appointment("en"), "cancelled").text())
                .contains("https://planera-az.vercel.app/book/elvin-barber");
    }

    @Test
    void onlyBookingMovingCancellingAndTheReminderSendMail() {
        given(appointments.findById(7L)).willReturn(Optional.of(appointment("az")));

        mailer.onAppointmentChanged(new AppointmentChanged(7L, Kind.STATUS));
        assertThat(sent).isEmpty();

        mailer.onAppointmentChanged(new AppointmentChanged(7L, Kind.CREATED));
        mailer.onAppointmentChanged(new AppointmentChanged(7L, Kind.RESCHEDULED));
        mailer.onAppointmentChanged(new AppointmentChanged(7L, Kind.CANCELLED));
        mailer.onAppointmentChanged(new AppointmentChanged(7L, Kind.REMINDER_DUE));
        assertThat(sent).extracting(EmailMessage::subject)
                .allMatch(s -> s.endsWith("30 oktyabr saat 18:00-da"))
                .hasSize(4);
    }
}
