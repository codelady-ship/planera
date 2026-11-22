package az.planera.auth;

import az.planera.domain.RefreshTokenRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * The real, writable admin account comes from the environment, never from
 * the repository: at startup {@code ADMIN_EMAIL} / {@code ADMIN_PASSWORD}
 * create it, or bring its password in line when it already exists. Nothing
 * happens unless both are set. The accounts listed in the README are public
 * and therefore read-only ({@code users.demo}); this is the only admin that
 * can change anything.
 *
 * <p>A bad value never stops the API: it is reported in the log (without the
 * address or the password) and skipped.
 */
@Component
public class AdminAccountInitializer implements ApplicationRunner {

    enum Outcome {
        /** One or both variables are empty: nothing is read or written. */
        NOT_CONFIGURED,
        /** The address or the password is not acceptable. */
        INVALID,
        /** The address belongs to an account that must not become the admin. */
        REFUSED,
        CREATED,
        UPDATED,
        UNCHANGED
    }

    /** The passwords printed in the README and on the login page; they can never be the real admin's. */
    private static final Set<String> PUBLIC_PASSWORDS = Set.of("Planera123", "demo1234");

    private static final int MIN_PASSWORD_LENGTH = 8;
    /** BCrypt reads at most 72 bytes. */
    private static final int MAX_PASSWORD_BYTES = 72;
    private static final String FULL_NAME = "Planera Admin";

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final Clock clock;
    private final String email;
    private final String password;

    public AdminAccountInitializer(
            UserRepository users,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwords,
            Clock clock,
            @Value("${planera.admin.email:}") String email,
            @Value("${planera.admin.password:}") String password) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.clock = clock;
        this.email = email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
        this.password = password == null ? "" : password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        apply();
    }

    /** Creates or updates the admin; the caller provides the transaction. */
    Outcome apply() {
        if (email.isEmpty() || password.isEmpty()) {
            if (!email.isEmpty() || !password.isEmpty()) {
                log.warn("Only one of ADMIN_EMAIL / ADMIN_PASSWORD is set: no admin account is created");
            }
            return Outcome.NOT_CONFIGURED;
        }
        if (!email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+") || email.length() > 255) {
            log.error("ADMIN_EMAIL is not an e-mail address: no admin account is created");
            return Outcome.INVALID;
        }
        if (password.length() < MIN_PASSWORD_LENGTH
                || password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES
                || PUBLIC_PASSWORDS.contains(password)) {
            log.error("ADMIN_PASSWORD must be 8-72 characters and not one of the public demo passwords: "
                    + "no admin account is created");
            return Outcome.INVALID;
        }

        User user = users.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            User admin = new User(email, FULL_NAME, UserRole.ADMIN);
            admin.setPasswordHash(passwords.encode(password));
            users.save(admin);
            log.info("Admin account from ADMIN_EMAIL created");
            return Outcome.CREATED;
        }
        if (user.isDemo()) {
            log.error("ADMIN_EMAIL is a public read-only demo account: choose another address");
            return Outcome.REFUSED;
        }
        if (user.getRole() == UserRole.PROVIDER) {
            log.error("ADMIN_EMAIL belongs to a provider account: choose another address");
            return Outcome.REFUSED;
        }
        boolean samePassword = user.getPasswordHash() != null && passwords.matches(password, user.getPasswordHash());
        if (user.getRole() == UserRole.ADMIN && samePassword) {
            return Outcome.UNCHANGED;
        }
        // A new password or a new role: whoever is signed in with the old one is signed out.
        user.setRole(UserRole.ADMIN);
        if (!samePassword) {
            user.setPasswordHash(passwords.encode(password));
        }
        refreshTokens.revokeAll(user.getId(), clock.instant());
        log.info("Admin account from ADMIN_EMAIL updated");
        return Outcome.UPDATED;
    }
}
