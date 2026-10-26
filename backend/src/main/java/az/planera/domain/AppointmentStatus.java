package az.planera.domain;

import java.util.Set;

/** Allowed transitions: PENDING -> CONFIRMED | CANCELLED, CONFIRMED -> CANCELLED | COMPLETED | NO_SHOW (#23). */
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

    public boolean canTransitionTo(AppointmentStatus next) {
        return switch (this) {
            case PENDING -> Set.of(CONFIRMED, CANCELLED).contains(next);
            case CONFIRMED -> Set.of(CANCELLED, COMPLETED, NO_SHOW).contains(next);
            case CANCELLED, COMPLETED, NO_SHOW -> false;
        };
    }
}
