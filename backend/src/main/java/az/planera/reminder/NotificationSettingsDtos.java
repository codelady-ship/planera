package az.planera.reminder;

import az.planera.config.DemoSafe;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class NotificationSettingsDtos {

    private NotificationSettingsDtos() {}

    /** Minutes before the start, largest first; empty = no reminders. */
    @DemoSafe("The caller's own settings.")
    public record SettingsView(List<Integer> reminderOffsets) {}

    public record SettingsRequest(@NotNull @Size(max = 4) List<Integer> reminderOffsets) {}
}
