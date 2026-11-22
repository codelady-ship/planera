package az.planera.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import az.planera.appointment.AppointmentService;
import az.planera.auth.AuthService;
import az.planera.availability.AvailabilityService;
import az.planera.category.CategoryService;
import az.planera.domain.ProviderProfileRepository;
import az.planera.personal.PersonalReminderService;
import az.planera.provider.FavoriteService;
import az.planera.provider.ProviderService;
import az.planera.provider.ServiceOfferingService;
import az.planera.push.PushService;
import az.planera.reminder.NotificationSettingsService;
import az.planera.review.ReviewService;
import az.planera.slot.SlotService;
import az.planera.stats.StatsService;
import az.planera.waitlist.WaitlistService;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * The admin account in the README (admin@planera.az) is public, so it is a
 * read-only demo admin: through the real filter chain its token is refused
 * on every endpoint that changes something, whatever the role needed, while
 * the admin screens still load. The real admin (ADMIN_EMAIL / ADMIN_PASSWORD,
 * no {@code demo} claim) keeps every admin action.
 *
 * <p>The endpoints are not typed in by hand: they are read from the running
 * handler mapping, so a new one is covered the day it is added.
 */
@WebMvcTest
@Import({SecurityConfig.class, JwtConfig.class, TimeConfig.class})
class DemoWriteGuardTest {

    /** Every admin action that exists today; the test fails when one disappears from the mapping. */
    private static final Map<String, String> ADMIN_WRITES = Map.of(
            "PATCH /api/admin/appointments/{id}/status", "{\"status\":\"CONFIRMED\"}",
            "POST /api/admin/categories", "{\"slug\":\"yeni\",\"name\":\"Yeni\",\"sortOrder\":7}",
            "PUT /api/admin/categories/{slug}", "{\"slug\":\"yeni\",\"name\":\"Yeni\",\"sortOrder\":7}",
            "DELETE /api/admin/categories/{slug}", "",
            "PUT /api/admin/providers/{providerId}/availability",
            "{\"rules\":[{\"day\":1,\"start\":\"09:00\",\"end\":\"18:00\"}]}",
            "POST /api/admin/providers/{providerId}/time-off",
            "{\"startsOn\":\"2026-12-01\",\"endsOn\":\"2026-12-02\"}",
            "DELETE /api/admin/providers/{providerId}/time-off/{timeOffId}", "",
            "POST /api/admin/providers/{providerId}/services",
            "{\"name\":\"Yeni xidmet\",\"price\":10.00,\"durationMinutes\":30}",
            "PUT /api/admin/providers/{providerId}/services/{serviceId}",
            "{\"name\":\"Yeni xidmet\",\"price\":10.00,\"durationMinutes\":30}",
            "DELETE /api/admin/providers/{providerId}/services/{serviceId}", "");

    private static final List<String> ADMIN_READS = List.of(
            "/api/admin/appointments?from=2026-11-16&to=2026-11-22",
            "/api/admin/stats",
            "/api/admin/providers/1/availability",
            "/api/admin/providers/1/services",
            "/api/me");

    @Autowired MockMvcTester mvc;
    @Autowired JwtEncoder encoder;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping mappings;

    @MockitoBean AppointmentService appointments;
    @MockitoBean AuthService auth;
    @MockitoBean AvailabilityService availability;
    @MockitoBean CategoryService categories;
    @MockitoBean PersonalReminderService notes;
    @MockitoBean FavoriteService favorites;
    @MockitoBean ProviderService catalog;
    @MockitoBean ServiceOfferingService services;
    @MockitoBean ProviderProfileRepository providers;
    @MockitoBean PushService push;
    @MockitoBean NotificationSettingsService settings;
    @MockitoBean ReviewService reviews;
    @MockitoBean SlotService slots;
    @MockitoBean StatsService stats;
    @MockitoBean WaitlistService waitlist;

    private String token(String email, boolean demo) {
        Instant expiresAt = Instant.now().plusSeconds(600);
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .subject(email)
                .issuedAt(expiresAt.minusSeconds(900))
                .expiresAt(expiresAt)
                .claim("roles", List.of("ADMIN"));
        if (demo) {
            claims.claim("demo", true);
        }
        return "Bearer " + encoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
    }

    /** The token AuthService gives the README admin now that the seed marks it demo. */
    private String readmeAdmin() {
        return token("admin@planera.az", true);
    }

    private String realAdmin() {
        return token("owner@example.test", false);
    }

    /** "METHOD /path/{variable}" of every endpoint of the API that is not a plain read. */
    private Set<String> writeEndpoints() {
        Set<String> found = new TreeSet<>();
        for (var entry : mappings.getHandlerMethods().entrySet()) {
            if (!entry.getValue().getBeanType().getName().startsWith("az.planera.")) {
                continue;
            }
            Set<RequestMethod> methods = entry.getKey().getMethodsCondition().getMethods();
            // A mapping without a method answers all of them, the writing ones included.
            Set<RequestMethod> effective = methods.isEmpty() ? Set.of(RequestMethod.values()) : methods;
            for (RequestMethod method : effective) {
                if (method == RequestMethod.GET || method == RequestMethod.HEAD
                        || method == RequestMethod.OPTIONS || method == RequestMethod.TRACE) {
                    continue;
                }
                for (String pattern : entry.getKey().getPatternValues()) {
                    found.add(method + " " + pattern);
                }
            }
        }
        return found;
    }

    private MockMvcTester.MockMvcRequestBuilder request(String endpoint, String bearer, String json) {
        String[] parts = endpoint.split(" ", 2);
        // Every path variable becomes "1": a valid id and a valid slug.
        String uri = parts[1].replaceAll("\\{[^}]+}", "1");
        var builder = mvc.method(HttpMethod.valueOf(parts[0])).uri(uri).header(HttpHeaders.AUTHORIZATION, bearer);
        return json.isEmpty() ? builder : builder.contentType(MediaType.APPLICATION_JSON).content(json);
    }

    @Test
    void theReadmeAdminIsRefusedOnEveryEndpointThatChangesSomething() {
        Set<String> endpoints = writeEndpoints();
        // The admin actions, the profile (name, phone, language) and the account endpoints are all in.
        assertThat(endpoints).containsAll(ADMIN_WRITES.keySet())
                .contains("PATCH /api/me", "PATCH /api/me/locale", "POST /api/auth/register", "POST /api/appointments")
                .hasSizeGreaterThanOrEqualTo(35);

        for (String endpoint : endpoints) {
            String json = ADMIN_WRITES.getOrDefault(endpoint, "{}");
            assertThat(request(endpoint, readmeAdmin(), json).header(HttpHeaders.ACCEPT_LANGUAGE, "en"))
                    .as(endpoint)
                    .hasStatus(HttpStatus.FORBIDDEN)
                    .bodyJson()
                    .extractingPath("$.detail")
                    .isEqualTo("Demo mode: changes are not saved. This account is read-only.");
        }
        // Refused in the filter: no controller, so no service, was reached.
        Mockito.verifyNoInteractions(appointments, auth, availability, categories, notes, favorites, catalog,
                services, providers, push, settings, reviews, slots, stats, waitlist);
    }

    @Test
    void theRefusalComesInTheSiteLanguages() {
        String endpoint = "PATCH /api/admin/appointments/{id}/status";
        assertThat(request(endpoint, readmeAdmin(), ADMIN_WRITES.get(endpoint)))
                .hasStatus(HttpStatus.FORBIDDEN).bodyJson().extractingPath("$.detail")
                .isEqualTo("Demo rejimi: dəyişikliklər saxlanmır. Bu hesab yalnız baxış üçündür.");
        assertThat(request(endpoint, readmeAdmin(), ADMIN_WRITES.get(endpoint)).header(HttpHeaders.ACCEPT_LANGUAGE, "ru"))
                .hasStatus(HttpStatus.FORBIDDEN).bodyJson().extractingPath("$.detail")
                .isEqualTo("Демо-режим: изменения не сохраняются. Эта учётная запись только для просмотра.");
    }

    @Test
    void theAdminActionsListIsComplete() {
        // Nothing under /api/admin changes data without being in the list the real-admin test walks through.
        assertThat(writeEndpoints().stream().filter(e -> e.contains(" /api/admin/")))
                .containsExactlyInAnyOrderElementsOf(ADMIN_WRITES.keySet());
    }

    @Test
    void theRealAdminKeepsEveryAdminAction() {
        for (var write : ADMIN_WRITES.entrySet()) {
            var result = request(write.getKey(), realAdmin(), write.getValue()).exchange();
            assertThat(result.getResponse().getStatus()).as(write.getKey()).isBetween(200, 204);
        }
        Mockito.verify(appointments).changeStatus(any(), any(), any());
        Mockito.verify(categories).create(any());
        Mockito.verify(categories).update(any(), any());
        Mockito.verify(categories).delete(any());
        Mockito.verify(availability).replaceWeekly(any(), any());
        Mockito.verify(availability).addTimeOff(any(), any());
        Mockito.verify(availability).deleteTimeOff(any(), any());
        Mockito.verify(services).create(any(), any());
        Mockito.verify(services).update(any(), any(), any());
        Mockito.verify(services).delete(any(), any());
    }

    @Test
    void theReadmeAdminStillOpensEveryAdminScreen() {
        given(auth.view("admin@planera.az")).willReturn(new az.planera.auth.AuthDtos.UserView(
                1L, "admin@planera.az", "Planera Admin", null, az.planera.domain.UserRole.ADMIN, null, true));
        for (String uri : ADMIN_READS) {
            assertThat(mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, readmeAdmin())).as(uri).hasStatusOk();
        }
        assertThat(mvc.get().uri("/api/me").header(HttpHeaders.AUTHORIZATION, readmeAdmin()))
                .bodyJson().extractingPath("$.demo").isEqualTo(true);
    }

    @Test
    void aCustomerTokenNeverReachesAnAdminAction() {
        // Unchanged rule, kept next to the new one: the role check still guards the admin endpoints.
        Instant expiresAt = Instant.now().plusSeconds(600);
        JwtClaimsSet claims = JwtClaimsSet.builder().subject("musteri@planera.az")
                .issuedAt(expiresAt.minusSeconds(900)).expiresAt(expiresAt)
                .claim("roles", List.of("CUSTOMER")).build();
        String customer = "Bearer " + encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        for (var write : ADMIN_WRITES.entrySet()) {
            assertThat(request(write.getKey(), customer, write.getValue())).as(write.getKey())
                    .hasStatus(HttpStatus.FORBIDDEN);
        }
        Mockito.verifyNoInteractions(categories, availability, services);
    }
}
