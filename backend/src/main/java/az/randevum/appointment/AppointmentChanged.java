package az.randevum.appointment;

/**
 * Published inside the transaction that books, moves, cancels or finishes
 * an appointment. Listeners (reminders, #56) reload it and act on its state.
 */
public record AppointmentChanged(Long appointmentId) {}
