package az.randevum.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    /** Reminder minutes before an appointment, comma-separated, e.g. "60,15,0" (#57). */
    @Column(name = "reminder_offsets", nullable = false)
    private String reminderOffsets = DEFAULT_REMINDER_OFFSETS;

    public static final String DEFAULT_REMINDER_OFFSETS = "60,15,0";

    protected User() {}

    public User(String email, String fullName, UserRole role) {
        this.email = email;
        this.fullName = fullName;
        this.role = role;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    /** Largest offset first; empty when the user turned reminders off. */
    public List<Integer> getReminderOffsets() {
        return Offsets.parse(reminderOffsets);
    }

    public void setReminderOffsets(Collection<Integer> offsets) {
        this.reminderOffsets = Offsets.join(offsets);
    }
}
