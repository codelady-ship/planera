package az.randevum.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import az.randevum.appointment.AppointmentService;
import az.randevum.auth.AuthDtos.UserView;
import az.randevum.availability.AvailabilityService;
import az.randevum.config.JwtConfig;
import az.randevum.config.SecurityConfig;
import az.randevum.domain.ProviderProfile;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.domain.UserRole;
import az.randevum.provider.ProviderPanelController;
import az.randevum.provider.ProviderService;
import az.randevum.provider.ServiceOfferingService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** Real bearer tokens through the filter chain: roles claim, expiry and the provider panel (#25, #26). */
@WebMvcTest({MeController.class, ProviderPanelController.class, AuthController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class JwtSecurityTest {

    @Autowired MockMvcTester mvc;
    @Autowired JwtEncoder encoder;

    @MockitoBean AuthService auth;
    @MockitoBean ProviderProfileRepository providers;
    @MockitoBean ProviderService catalog;
    @MockitoBean ServiceOfferingService services;
    @MockitoBean AvailabilityService availability;
    @MockitoBean AppointmentService appointments;

    private String token(String email, String role, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(email)
                .issuedAt(expiresAt.minusSeconds(900))
                .expiresAt(expiresAt)
                .claim("roles", List.of(role))
                .build();
        return "Bearer " + encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
    }

    private String valid(String email, String role) {
        return token(email, role, Instant.now().plusSeconds(600));
    }

    @Test
    void validTokenReachesTheProfile() {
        given(auth.view("musteri@randevum.az"))
                .willReturn(new UserView(2L, "musteri@randevum.az", "Aynur Qasımova", null, UserRole.CUSTOMER, null));

        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, valid("musteri@randevum.az", "CUSTOMER")))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.fullName")
                .isEqualTo("Aynur Qasımova");
    }

    @Test
    void expiredOrForgedTokensAre401() {
        assertThat(mvc.get().uri("/api/me")
                        .header(HttpHeaders.AUTHORIZATION, token("musteri@randevum.az", "CUSTOMER", Instant.now().minusSeconds(120))))
                .hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, "Bearer abc.def.ghi"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void customersCannotOpenTheProviderPanel() {
        assertThat(mvc.get().uri("/api/provider/services")
                        .header(HttpHeaders.AUTHORIZATION, valid("musteri@randevum.az", "CUSTOMER")))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void providerWorksOnItsOwnProfileOnly() {
        ProviderProfile barber = Mockito.mock(ProviderProfile.class);
        given(barber.getId()).willReturn(7L);
        given(providers.findByUserEmailIgnoreCase("elvin-barber@randevum.az")).willReturn(Optional.of(barber));
        given(services.list(7L)).willReturn(List.of());
        given(appointments.changeStatus(eq(7L), anyLong(), any()))
                .willThrow(new AccessDeniedException("Bu randevu sizə aid deyil"));
        String provider = valid("elvin-barber@randevum.az", "PROVIDER");

        assertThat(mvc.get().uri("/api/provider/services").header(HttpHeaders.AUTHORIZATION, provider)).hasStatusOk();
        assertThat(mvc.patch().uri("/api/provider/appointments/99/status")
                        .header(HttpHeaders.AUTHORIZATION, provider)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"COMPLETED\"}"))
                .hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    void authEndpointsArePublicAndValidated() {
        assertThat(mvc.post().uri("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"A\",\"email\":\"yanlis\",\"password\":\"123\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors.password")
                .isEqualTo("Şifrə 8-72 simvol olmalıdır");
    }
}
