package az.planera.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;

import az.planera.appointment.AppointmentDtos.AppointmentView;
import az.planera.appointment.AppointmentDtos.ProviderAppointmentView;
import az.planera.appointment.AppointmentService;
import az.planera.auth.AuthDtos.UserView;
import az.planera.auth.AuthService;
import az.planera.availability.AvailabilityService;
import az.planera.category.CategoryService;
import az.planera.common.PageResponse;
import az.planera.domain.AppointmentStatus;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.UserRole;
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
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.lang.reflect.WildcardType;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

/**
 * Every read a public demo token can make, through the real filter chain:
 * customers' notes, names and phones are hidden on each endpoint that carries
 * them, real accounts still get everything, and no read endpoint exists whose
 * response type has not been classified for the demo.
 */
@WebMvcTest
@Import({SecurityConfig.class, JwtConfig.class, TimeConfig.class})
class DemoResponseAdviceTest {

    private static final String NOTE = "Zeng edin: +994501112233, qapi kodu 4471";
    private static final String PHONE = "+994501112233";
    private static final String CUSTOMER = "Aynur Qasimova";

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

    private static AppointmentView appointment() {
        return new AppointmentView(1L, "RV-2026-000001", "elvin-barber", "Elvin Mammadov", 2L, "Sac kesimi",
                LocalDate.of(2026, 11, 18), "10:00", 30, Instant.EPOCH, Instant.EPOCH.plusSeconds(1800),
                AppointmentStatus.CONFIRMED, new BigDecimal("15.00"), NOTE, false, false);
    }

    private static ProviderAppointmentView booked() {
        return new ProviderAppointmentView(appointment(), CUSTOMER, PHONE);
    }

    private String token(String email, String role, boolean demo) {
        Instant expiresAt = Instant.now().plusSeconds(600);
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .subject(email)
                .issuedAt(expiresAt.minusSeconds(900))
                .expiresAt(expiresAt)
                .claim("roles", List.of(role));
        if (demo) {
            claims.claim("demo", true);
        }
        return "Bearer " + encoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
    }

    private String demoAdmin() {
        return token("demo@planera.az", "ADMIN", true);
    }

    private String realAdmin() {
        return token("admin@planera.az", "ADMIN", false);
    }

    private String body(String uri, String bearer) {
        var result = mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, bearer).exchange();
        assertThat(result).hasStatusOk();
        try {
            return result.getResponse().getContentAsString();
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void assertNoCustomerData(String json) {
        assertThat(json).doesNotContain("994501112233").doesNotContain("4471").doesNotContain("Zeng edin")
                .doesNotContain("Qasimova");
    }

    @BeforeEach
    void data() {
        given(appointments.get(any(), eq(1L))).willReturn(appointment());
        given(appointments.mine(any(), any())).willReturn(List.of(appointment()));
        given(appointments.forProvider(any(), any(), any())).willReturn(List.of(booked()));
        ProviderProfile self = Mockito.mock(ProviderProfile.class);
        given(self.getId()).willReturn(7L);
        given(providers.findByUserEmailIgnoreCase(any())).willReturn(Optional.of(self));
    }

    // --- every endpoint that returns an appointment --------------------------------------------

    @Test
    void demoReadsOneAppointmentWithoutTheNote() {
        String json = body("/api/appointments/1", demoAdmin());
        assertNoCustomerData(json);
        assertThat(json).contains("\"note\":null").contains("RV-2026-000001").contains("Sac kesimi");
    }

    @Test
    void demoReadsOneAppointmentWithoutTheNoteInAnySpelling() {
        for (String uri : List.of("/api/appointments/1", "/api/appointments/1/", "/api/appointments/01")) {
            var result = mvc.get().uri(uri).header(HttpHeaders.AUTHORIZATION, demoAdmin()).exchange();
            try {
                assertNoCustomerData(result.getResponse().getContentAsString());
            } catch (java.io.UnsupportedEncodingException e) {
                throw new IllegalStateException(e);
            }
        }
    }

    @Test
    void demoReadsItsOwnAppointmentListWithoutNotes() {
        for (String scope : List.of("upcoming", "past", "cancelled")) {
            String json = body("/api/me/appointments?scope=" + scope, demoAdmin());
            assertNoCustomerData(json);
            assertThat(json).contains("\"note\":null");
        }
    }

    @Test
    void demoReadsTheAdminCalendarAnonymized() {
        String json = body("/api/admin/appointments?from=2026-11-16&to=2026-11-22", demoAdmin());
        assertNoCustomerData(json);
        assertThat(json).contains("\"customerName\":\"Aynur Q.\"").contains("\"customerPhone\":null")
                .contains("\"note\":null");
    }

    @Test
    void aDemoProviderWouldReadItsCalendarAnonymizedToo() {
        String json = body("/api/provider/appointments?from=2026-11-16&to=2026-11-22",
                token("demo-usta@planera.az", "PROVIDER", true));
        assertNoCustomerData(json);
        assertThat(json).contains("\"customerName\":\"Aynur Q.\"");
    }

    @Test
    void headIsMaskedLikeGet() throws Exception {
        // MockMvc keeps the body of a HEAD answer (a real server drops it): it must be the masked one.
        var result = mvc.head().uri("/api/appointments/1").header(HttpHeaders.AUTHORIZATION, demoAdmin()).exchange();
        assertThat(result).hasStatusOk();
        assertNoCustomerData(result.getResponse().getContentAsString());
    }

    // --- real accounts are not touched ---------------------------------------------------------

    @Test
    void realAdminStillReadsEverything() {
        assertThat(body("/api/appointments/1", realAdmin())).contains(NOTE);
        assertThat(body("/api/admin/appointments?from=2026-11-16&to=2026-11-22", realAdmin()))
                .contains(NOTE).contains(CUSTOMER).contains("994501112233");
        assertThat(body("/api/me/appointments", token("musteri@planera.az", "CUSTOMER", false))).contains(NOTE);
        assertThat(body("/api/provider/appointments?from=2026-11-16&to=2026-11-22",
                token("usta@planera.az", "PROVIDER", false))).contains(NOTE).contains(CUSTOMER);
    }

    @Test
    void aTokenWithDemoFalseIsARealAccount() {
        Instant expiresAt = Instant.now().plusSeconds(600);
        JwtClaimsSet claims = JwtClaimsSet.builder().subject("admin@planera.az")
                .issuedAt(expiresAt.minusSeconds(900)).expiresAt(expiresAt)
                .claim("roles", List.of("ADMIN")).claim("demo", false).build();
        String bearer = "Bearer " + encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        assertThat(body("/api/appointments/1", bearer)).contains(NOTE);
    }

    // --- safe types pass, errors keep their format ---------------------------------------------

    @Test
    void demoStillReadsItsProfileAndErrors() {
        given(auth.view("demo@planera.az"))
                .willReturn(new UserView(3L, "demo@planera.az", "Demo Admin", null, UserRole.ADMIN, null, true));
        assertThat(body("/api/me", demoAdmin())).contains("\"demo\":true");

        given(appointments.get(any(), eq(404L)))
                .willThrow(new az.planera.common.NotFoundException(az.planera.common.Messages.key("appointment.notFound", 404)));
        assertThat(mvc.get().uri("/api/appointments/404").header(HttpHeaders.AUTHORIZATION, demoAdmin()))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson().extractingPath("$.status").isEqualTo(404);
    }

    // --- deny by default -----------------------------------------------------------------------

    record Unclassified(String customerPhone) {}

    @Test
    void anUnclassifiedTypeIsRefusedNotShown() {
        assertThatThrownBy(() -> DemoResponseAdvice.forDemo(new Unclassified(PHONE))).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> DemoResponseAdvice.forDemo(List.of(new Unclassified(PHONE))))
                .isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> DemoResponseAdvice.forDemo(new PageResponse<>(List.of(new Unclassified(PHONE)), 0, 1, 1, 1)))
                .isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> DemoResponseAdvice.forDemo(java.util.Map.of("phone", PHONE)))
                .isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> DemoResponseAdvice.forDemo(PHONE)).isInstanceOf(RuntimeException.class);
    }

    @Test
    void listsAndPagesAreMaskedElementByElement() {
        Object list = DemoResponseAdvice.forDemo(List.of(booked(), booked()));
        assertThat(list).asString().doesNotContain("994501112233").doesNotContain("Qasimova");
        Object page = DemoResponseAdvice.forDemo(new PageResponse<>(List.of(appointment()), 0, 20, 1, 1));
        assertThat(((PageResponse<?>) page).content()).allSatisfy(a -> assertThat(((AppointmentView) a).note()).isNull());
        assertThat(((PageResponse<?>) page).totalElements()).isEqualTo(1);
        assertThat(DemoResponseAdvice.forDemo(null)).isNull();
        assertThat(DemoResponseAdvice.forDemo(ProblemDetail.forStatus(404))).isInstanceOf(ProblemDetail.class);
    }

    /**
     * The guard for the next endpoint: every handler a demo token can reach (GET/HEAD) must return a
     * type that is {@link DemoMaskable} or {@link DemoSafe}, and a {@code @DemoSafe} type must not
     * carry a maskable one inside (it would pass unmasked).
     */
    @Test
    void everyReadEndpointHasAClassifiedResponseType() {
        List<String> problems = new ArrayList<>();
        int checked = 0;
        for (var entry : mappings.getHandlerMethods().entrySet()) {
            RequestMappingInfo info = entry.getKey();
            HandlerMethod handler = entry.getValue();
            if (!handler.getBeanType().getName().startsWith("az.planera.")) {
                continue;
            }
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            if (!methods.isEmpty() && !methods.contains(RequestMethod.GET) && !methods.contains(RequestMethod.HEAD)) {
                continue;
            }
            checked++;
            Class<?> type = element(handler.getMethod().getGenericReturnType());
            String where = info + " -> " + type.getSimpleName();
            if (DemoMaskable.class.isAssignableFrom(type)) {
                continue;
            }
            if (!type.isAnnotationPresent(DemoSafe.class)) {
                problems.add(where + ": add @DemoSafe(\"why\") or implement DemoMaskable");
            } else if (carriesMaskable(type, new HashSet<>())) {
                problems.add(where + ": is @DemoSafe but contains a DemoMaskable; implement DemoMaskable instead");
            }
        }
        assertThat(problems).isEmpty();
        assertThat(checked).isGreaterThanOrEqualTo(25);
    }

    /** List&lt;X&gt;, PageResponse&lt;X&gt; and ResponseEntity&lt;X&gt; are looked through, like the advice does. */
    private static Class<?> element(Type type) {
        if (type instanceof ParameterizedType generic) {
            Class<?> raw = (Class<?>) generic.getRawType();
            if (Collection.class.isAssignableFrom(raw) || raw == PageResponse.class || raw == ResponseEntity.class) {
                return element(generic.getActualTypeArguments()[0]);
            }
            return raw;
        }
        if (type instanceof WildcardType wildcard) {
            return element(wildcard.getUpperBounds()[0]);
        }
        return (Class<?>) type;
    }

    private static boolean carriesMaskable(Class<?> type, Set<Class<?>> seen) {
        if (!type.isRecord() || !seen.add(type)) {
            return false;
        }
        for (RecordComponent component : type.getRecordComponents()) {
            Class<?> inner = element(component.getGenericType());
            if (DemoMaskable.class.isAssignableFrom(inner) || carriesMaskable(inner, seen)) {
                return true;
            }
        }
        return false;
    }

    @Test
    void demoStillCannotWrite() {
        assertThat(mvc.patch().uri("/api/appointments/1/cancel").header(HttpHeaders.AUTHORIZATION, demoAdmin()))
                .hasStatus(HttpStatus.FORBIDDEN);
        assertThat(mvc.patch().uri("/api/admin/appointments/1/status")
                        .header(HttpHeaders.AUTHORIZATION, demoAdmin())
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CANCELLED\"}"))
                .hasStatus(HttpStatus.FORBIDDEN);
        Mockito.verify(appointments, Mockito.never()).cancel(any(), any(), any());
        Mockito.verify(appointments, Mockito.never()).changeStatus(isNull(), any(), any());
    }
}
