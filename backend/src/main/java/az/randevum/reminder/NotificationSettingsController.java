package az.randevum.reminder;

import az.randevum.reminder.NotificationSettingsDtos.SettingsRequest;
import az.randevum.reminder.NotificationSettingsDtos.SettingsView;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Reminder settings of the signed-in user (#57). */
@RestController
@RequestMapping("/api/me/notification-settings")
public class NotificationSettingsController {

    private final NotificationSettingsService settings;

    public NotificationSettingsController(NotificationSettingsService settings) {
        this.settings = settings;
    }

    @GetMapping
    public SettingsView get(Authentication auth) {
        return settings.get(auth.getName());
    }

    @PutMapping
    public SettingsView update(Authentication auth, @Valid @RequestBody SettingsRequest request) {
        return settings.update(auth.getName(), request.reminderOffsets());
    }
}
