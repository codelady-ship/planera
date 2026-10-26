package az.randevum.reminder;

import az.randevum.appointment.AppointmentChanged;
import az.randevum.common.BusinessRuleException;
import az.randevum.common.NotFoundException;
import az.randevum.domain.Appointment;
import az.randevum.domain.AppointmentRepository;
import az.randevum.domain.User;
import az.randevum.domain.UserRepository;
import az.randevum.reminder.NotificationSettingsDtos.SettingsView;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The user's reminder offsets (#57); a change re-plans every upcoming appointment. */
@Service
@Transactional
public class NotificationSettingsService {

    private final UserRepository users;
    private final AppointmentRepository appointments;
    private final ReminderService reminders;
    private final Clock clock;

    public NotificationSettingsService(
            UserRepository users, AppointmentRepository appointments, ReminderService reminders, Clock clock) {
        this.users = users;
        this.appointments = appointments;
        this.reminders = reminders;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public SettingsView get(String email) {
        return new SettingsView(user(email).getReminderOffsets());
    }

    public SettingsView update(String email, List<Integer> offsets) {
        for (Integer offset : offsets) {
            if (offset == null || !ReminderService.ALLOWED_OFFSETS.contains(offset)) {
                throw new BusinessRuleException("Xatırlatma vaxtı yalnız 1 gün, 1 saat, 15 dəqiqə və ya randevu saatı ola bilər");
            }
        }
        User user = user(email);
        user.setReminderOffsets(offsets);
        for (Appointment a : appointments.findUpcoming(user.getId(), clock.instant())) {
            reminders.onAppointmentChanged(new AppointmentChanged(a.getId()));
        }
        return new SettingsView(user.getReminderOffsets());
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("İstifadəçi tapılmadı"));
    }
}
