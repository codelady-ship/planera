package az.planera.appointment;

/**
 * Published inside the transaction that books, moves, cancels or finishes
 * an appointment, and when its day-before reminder is due. Listeners
 * (reminders #56, e-mails #43, the waitlist #45) reload it and act on its
 * state; {@code kind} says what just happened.
 */
public record AppointmentChanged(Long appointmentId, Kind kind) {

    public enum Kind {
        CREATED,
        RESCHEDULED,
        CANCELLED,
        /** Confirmed, completed or no-show by the provider. */
        STATUS,
        /** The 24-hour reminder came due (#43). */
        REMINDER_DUE
    }

    /** A change of state without a specific trigger, e.g. new reminder settings. */
    public AppointmentChanged(Long appointmentId) {
        this(appointmentId, Kind.STATUS);
    }
}
