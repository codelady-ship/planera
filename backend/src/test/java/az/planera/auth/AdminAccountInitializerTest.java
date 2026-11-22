package az.planera.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import az.planera.auth.AdminAccountInitializer.Outcome;
import az.planera.domain.RefreshTokenRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * The real admin from ADMIN_EMAIL / ADMIN_PASSWORD. The values here are made
 * up for the test; no real password is ever in the repository.
 */
@ExtendWith(OutputCaptureExtension.class)
class AdminAccountInitializerTest {

    private static final String EMAIL = "owner@example.test";
    private static final String PASSWORD = "only-for-this-unit-test";
    private static final Instant NOW = Instant.parse("2026-11-22T10:00:00Z");

    private final UserRepository users = mock(UserRepository.class);
    private final RefreshTokenRepository refreshTokens = mock(RefreshTokenRepository.class);
    private final PasswordEncoder passwords = new BCryptPasswordEncoder(4);

    private AdminAccountInitializer initializer(String email, String password) {
        return new AdminAccountInitializer(
                users, refreshTokens, passwords, Clock.fixed(NOW, ZoneOffset.UTC), email, password);
    }

    private User existing(UserRole role, String password, boolean demo) {
        User user = mock(User.class);
        given(user.getId()).willReturn(5L);
        given(user.getRole()).willReturn(role);
        given(user.isDemo()).willReturn(demo);
        given(user.getPasswordHash()).willReturn(password == null ? null : passwords.encode(password));
        given(users.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.of(user));
        return user;
    }

    @Test
    void nothingHappensWithoutBothVariables() {
        assertThat(initializer("", "").apply()).isEqualTo(Outcome.NOT_CONFIGURED);
        assertThat(initializer(null, null).apply()).isEqualTo(Outcome.NOT_CONFIGURED);
        assertThat(initializer(EMAIL, "").apply()).isEqualTo(Outcome.NOT_CONFIGURED);
        assertThat(initializer("", PASSWORD).apply()).isEqualTo(Outcome.NOT_CONFIGURED);
        assertThat(initializer("   ", PASSWORD).apply()).isEqualTo(Outcome.NOT_CONFIGURED);
        verifyNoInteractions(users, refreshTokens);
    }

    @Test
    void createsTheAdminWhenBothAreSet() {
        given(users.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.empty());

        assertThat(initializer("  Owner@Example.TEST ", PASSWORD).apply()).isEqualTo(Outcome.CREATED);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).save(saved.capture());
        User admin = saved.getValue();
        assertThat(admin.getEmail()).isEqualTo(EMAIL);
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
        // Writable: only demo accounts are read-only.
        assertThat(admin.isDemo()).isFalse();
        // Stored as a BCrypt hash, never as text.
        assertThat(admin.getPasswordHash()).startsWith("$2").doesNotContain(PASSWORD);
        assertThat(passwords.matches(PASSWORD, admin.getPasswordHash())).isTrue();
    }

    @Test
    void aSecondStartWithTheSameValuesChangesNothing() {
        User admin = existing(UserRole.ADMIN, PASSWORD, false);

        assertThat(initializer(EMAIL, PASSWORD).apply()).isEqualTo(Outcome.UNCHANGED);

        verify(admin, never()).setPasswordHash(any());
        verify(users, never()).save(any());
        verifyNoInteractions(refreshTokens);
    }

    @Test
    void aNewPasswordReplacesTheOldOneAndEndsItsSessions() {
        User admin = existing(UserRole.ADMIN, "the-previous-test-value", false);

        assertThat(initializer(EMAIL, PASSWORD).apply()).isEqualTo(Outcome.UPDATED);

        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        verify(admin).setPasswordHash(hash.capture());
        assertThat(passwords.matches(PASSWORD, hash.getValue())).isTrue();
        verify(refreshTokens).revokeAll(eq(5L), eq(NOW));
    }

    @Test
    void anOwnCustomerAccountBecomesTheAdminWithTheNewPassword() {
        User customer = existing(UserRole.CUSTOMER, "registered-on-the-site", false);

        assertThat(initializer(EMAIL, PASSWORD).apply()).isEqualTo(Outcome.UPDATED);

        verify(customer).setRole(UserRole.ADMIN);
        verify(customer).setPasswordHash(any());
        // Whoever registered the address before cannot ride an old session into the admin role.
        verify(refreshTokens).revokeAll(eq(5L), eq(NOW));
    }

    @Test
    void aPublicDemoAccountNeverBecomesTheRealAdmin() {
        User demo = existing(UserRole.ADMIN, "Planera123", true);

        assertThat(initializer(EMAIL, PASSWORD).apply()).isEqualTo(Outcome.REFUSED);

        verify(demo, never()).setPasswordHash(any());
        verify(demo, never()).setRole(any());
        verifyNoInteractions(refreshTokens);
    }

    @Test
    void aProviderAccountIsLeftAlone() {
        User provider = existing(UserRole.PROVIDER, "Planera123", false);

        assertThat(initializer(EMAIL, PASSWORD).apply()).isEqualTo(Outcome.REFUSED);

        verify(provider, never()).setPasswordHash(any());
        verify(provider, never()).setRole(any());
    }

    @Test
    void badValuesAreSkippedInsteadOfStoppingTheApi() {
        assertThat(initializer("not-an-address", PASSWORD).apply()).isEqualTo(Outcome.INVALID);
        assertThat(initializer(EMAIL, "short").apply()).isEqualTo(Outcome.INVALID);
        assertThat(initializer(EMAIL, "x".repeat(73)).apply()).isEqualTo(Outcome.INVALID);
        // The passwords printed in the README can never be the real admin's.
        assertThat(initializer(EMAIL, "Planera123").apply()).isEqualTo(Outcome.INVALID);
        assertThat(initializer(EMAIL, "demo1234").apply()).isEqualTo(Outcome.INVALID);
        verifyNoInteractions(users, refreshTokens);
    }

    @Test
    void neitherTheAddressNorThePasswordIsLogged(CapturedOutput output) {
        given(users.findByEmailIgnoreCase(EMAIL)).willReturn(Optional.empty());
        initializer(EMAIL, PASSWORD).apply();
        existing(UserRole.ADMIN, "the-previous-test-value", false);
        initializer(EMAIL, PASSWORD).apply();
        existing(UserRole.ADMIN, "Planera123", true);
        initializer(EMAIL, PASSWORD).apply();
        initializer(EMAIL, "short").apply();
        initializer(EMAIL, "").apply();

        assertThat(output.getAll()).contains("Admin account from ADMIN_EMAIL created")
                .doesNotContain(PASSWORD).doesNotContain("the-previous-test-value").doesNotContain("short")
                .doesNotContain(EMAIL);
    }
}
