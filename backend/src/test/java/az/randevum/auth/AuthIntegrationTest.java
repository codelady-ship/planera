package az.randevum.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import az.randevum.TestcontainersConfiguration;
import az.randevum.auth.AuthDtos.LoginRequest;
import az.randevum.auth.AuthDtos.RegisterRequest;
import az.randevum.auth.AuthDtos.TokenResponse;
import az.randevum.common.ConflictException;
import az.randevum.common.UnauthorizedException;
import az.randevum.config.JwtConfig;
import az.randevum.domain.UserRole;
import az.randevum.redis.RateLimiter;
import az.randevum.redis.RedisSupport;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Register, login with the demo password, refresh rotation and logout (#25). */
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({
    TestcontainersConfiguration.class,
    AuthService.class,
    JwtConfig.class,
    RateLimiter.class,
    RedisSupport.class,
    AuthIntegrationTest.Beans.class
})
@ActiveProfiles("dev")
class AuthIntegrationTest {

    @TestConfiguration
    static class Beans {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }

        @Bean
        PasswordEncoder passwordEncoder() {
            return new BCryptPasswordEncoder();
        }
    }

    @Autowired AuthService auth;
    @Autowired JwtDecoder decoder;

    @Test
    void demoCustomerLogsInWithAShortLivedJwt() {
        TokenResponse tokens = auth.login(new LoginRequest(" Musteri@Randevum.az ", "Randevum123"));

        Jwt jwt = decoder.decode(tokens.accessToken());
        assertThat(jwt.getSubject()).isEqualTo("musteri@randevum.az");
        assertThat(jwt.getClaimAsStringList("roles")).containsExactly("CUSTOMER");
        assertThat(jwt.getExpiresAt()).isBefore(jwt.getIssuedAt().plus(AuthService.ACCESS_TTL).plusSeconds(1));
        assertThat(tokens.user().role()).isEqualTo(UserRole.CUSTOMER);
    }

    @Test
    void providerLoginCarriesItsSlug() {
        assertThat(auth.login(new LoginRequest("elvin-barber@randevum.az", "Randevum123")).user().providerSlug())
                .isEqualTo("elvin-barber");
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() {
        assertThatThrownBy(() -> auth.login(new LoginRequest("musteri@randevum.az", "yanlis-sifre")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("E-poçt və ya şifrə yanlışdır");
        assertThatThrownBy(() -> auth.login(new LoginRequest("yoxdur@randevum.az", "yanlis-sifre")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("E-poçt və ya şifrə yanlışdır");
    }

    @Test
    void registrationCreatesACustomerAndRejectsDuplicates() {
        RegisterRequest request = new RegisterRequest("Nərmin Əliyeva", "Nermin@Example.az", "gizli-sifre-1", "+994 50 123 45 67");
        TokenResponse tokens = auth.register(request);

        assertThat(tokens.user().email()).isEqualTo("nermin@example.az");
        assertThat(tokens.user().role()).isEqualTo(UserRole.CUSTOMER);
        assertThat(auth.login(new LoginRequest("nermin@example.az", "gizli-sifre-1")).user().id())
                .isEqualTo(tokens.user().id());
        assertThatThrownBy(() -> auth.register(request)).isInstanceOf(ConflictException.class);
    }

    @Test
    void refreshRotatesAndAReplayEndsEverySession() {
        TokenResponse first = auth.login(new LoginRequest("admin@randevum.az", "Randevum123"));
        TokenResponse second = auth.refresh(first.refreshToken());
        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());

        assertThatThrownBy(() -> auth.refresh(first.refreshToken())).isInstanceOf(UnauthorizedException.class);
        // The replay revoked the newer token as well.
        assertThatThrownBy(() -> auth.refresh(second.refreshToken())).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void logoutRevokesTheRefreshToken() {
        TokenResponse tokens = auth.login(new LoginRequest("admin@randevum.az", "Randevum123"));
        auth.logout(tokens.refreshToken());
        assertThatThrownBy(() -> auth.refresh(tokens.refreshToken())).isInstanceOf(UnauthorizedException.class);
    }
}
