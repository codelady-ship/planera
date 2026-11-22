package az.planera.auth;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.TestcontainersConfiguration;
import az.planera.auth.AuthDtos.LoginRequest;
import az.planera.auth.AuthDtos.TokenResponse;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * The whole API starts against a real PostgreSQL with the demo data and the
 * two variables set, as on Render: the real admin exists, is writable and
 * signs in; the public accounts stay as the seed made them. The values are
 * made up for this test. Skipped without Docker; CI runs it.
 */
@Testcontainers(disabledWithoutDocker = true)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {
    "planera.admin.email=Owner@Example.test",
    "planera.admin.password=only-for-this-integration-test"
})
@ActiveProfiles("demo")
class AdminAccountStartupIntegrationTest {

    @Autowired UserRepository users;
    @Autowired AuthService auth;
    @Autowired JwtDecoder decoder;
    @Autowired AdminAccountInitializer initializer;

    @Test
    void theAdminFromTheEnvironmentIsCreatedAtStartupAndIsWritable() {
        User admin = users.findByEmailIgnoreCase("owner@example.test").orElseThrow();
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
        assertThat(admin.isDemo()).isFalse();
        assertThat(admin.getPasswordHash()).startsWith("$2");

        TokenResponse tokens = auth.login(new LoginRequest("owner@example.test", "only-for-this-integration-test"));
        Jwt jwt = decoder.decode(tokens.accessToken());
        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("ADMIN");
        // No demo claim: DemoReadOnlyFilter lets its writes through.
        assertThat(jwt.hasClaim("demo")).isFalse();
        assertThat(tokens.user().demo()).isFalse();
    }

    @Test
    void aRestartWithTheSameValuesKeepsOneUnchangedAccount() {
        String hash = users.findByEmailIgnoreCase("owner@example.test").orElseThrow().getPasswordHash();
        long count = users.count();

        initializer.run(null);

        assertThat(users.count()).isEqualTo(count);
        assertThat(users.findByEmailIgnoreCase("owner@example.test").orElseThrow().getPasswordHash()).isEqualTo(hash);
    }

    @Test
    void thePublicAdminsStayReadOnlyWithTheirPublicPasswords() {
        for (String[] account : new String[][] {{"admin@planera.az", "Planera123"}, {"demo@planera.az", "demo1234"}}) {
            TokenResponse tokens = auth.login(new LoginRequest(account[0], account[1]));
            assertThat(tokens.user().role()).isEqualTo(UserRole.ADMIN);
            assertThat(tokens.user().demo()).isTrue();
            assertThat(decoder.decode(tokens.accessToken()).getClaimAsBoolean("demo")).isTrue();
        }
        // The only writable admin is the one from the environment.
        assertThat(users.findAll().stream().filter(u -> u.getRole() == UserRole.ADMIN && !u.isDemo()))
                .extracting(User::getEmail)
                .containsExactly("owner@example.test");
    }
}

/** Without the two variables the same start creates no admin at all. */
@Testcontainers(disabledWithoutDocker = true)
@Import(TestcontainersConfiguration.class)
@SpringBootTest(properties = {"planera.admin.email=", "planera.admin.password="})
@ActiveProfiles("demo")
class NoAdminWithoutEnvironmentIntegrationTest {

    @Autowired UserRepository users;

    @Test
    void noWritableAdminExists() {
        assertThat(users.findAll().stream().filter(u -> u.getRole() == UserRole.ADMIN && !u.isDemo())).isEmpty();
        assertThat(users.findAll().stream().filter(u -> u.getRole() == UserRole.ADMIN))
                .extracting(User::getEmail)
                .containsExactlyInAnyOrder("admin@planera.az", "demo@planera.az");
    }
}
