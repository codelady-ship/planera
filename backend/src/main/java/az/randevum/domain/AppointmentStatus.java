package az.randevum.domain;

public enum AppointmentStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    COMPLETED,
    NO_SHOW;

    /** Active appointments hold their slot (see the appointments_no_overlap constraint). */
    public boolean isActive() {
        return this == PENDING || this == CONFIRMED;
    }
}
