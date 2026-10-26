package az.planera.reminder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Every minute: send the reminders that are due (#56). A failure is logged and retried next minute. */
@Component
public class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    private final ReminderService reminders;

    public ReminderJob(ReminderService reminders) {
        this.reminders = reminders;
    }

    @Scheduled(fixedDelayString = "PT1M", initialDelayString = "PT30S")
    public void run() {
        try {
            int sent = reminders.sendDue();
            if (sent > 0) {
                log.info("Sent {} reminder(s)", sent);
            }
        } catch (RuntimeException e) {
            log.error("Reminder job failed, will retry in a minute", e);
        }
    }
}
