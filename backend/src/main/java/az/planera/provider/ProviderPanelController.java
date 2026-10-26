package az.planera.provider;

import az.planera.appointment.AppointmentDtos.AppointmentView;
import az.planera.appointment.AppointmentDtos.ProviderAppointmentView;
import az.planera.appointment.AppointmentDtos.StatusRequest;
import az.planera.appointment.AppointmentService;
import az.planera.availability.AvailabilityDtos.AvailabilityView;
import az.planera.availability.AvailabilityDtos.TimeOffRequest;
import az.planera.availability.AvailabilityDtos.TimeOffView;
import az.planera.availability.AvailabilityDtos.WeeklyRequest;
import az.planera.availability.AvailabilityService;
import az.planera.common.NotFoundException;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.provider.ProviderDtos.ProviderDetail;
import az.planera.provider.ProviderDtos.ServiceRequest;
import az.planera.provider.ProviderDtos.ServiceView;
import az.planera.stats.StatsDtos.StatsView;
import az.planera.stats.StatsService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A provider's own panel (#26). The provider is resolved from the token's
 * user, so a provider can never address another provider's data; admins use
 * the {@code /api/admin} endpoints instead.
 */
@RestController
@RequestMapping("/api/provider")
@PreAuthorize("hasRole('PROVIDER')")
public class ProviderPanelController {

    private final ProviderProfileRepository providers;
    private final ProviderService catalog;
    private final ServiceOfferingService services;
    private final AvailabilityService availability;
    private final AppointmentService appointments;
    private final StatsService stats;

    public ProviderPanelController(
            ProviderProfileRepository providers,
            ProviderService catalog,
            ServiceOfferingService services,
            AvailabilityService availability,
            AppointmentService appointments,
            StatsService stats) {
        this.providers = providers;
        this.catalog = catalog;
        this.services = services;
        this.availability = availability;
        this.appointments = appointments;
        this.stats = stats;
    }

    @GetMapping("/me")
    public ProviderDetail me(Authentication auth) {
        return catalog.detail(self(auth).getSlug());
    }

    @GetMapping("/services")
    public List<ServiceView> services(Authentication auth) {
        return services.list(self(auth).getId());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceView createService(Authentication auth, @Valid @RequestBody ServiceRequest request) {
        return services.create(self(auth).getId(), request);
    }

    @PutMapping("/services/{serviceId}")
    public ServiceView updateService(
            Authentication auth, @PathVariable Long serviceId, @Valid @RequestBody ServiceRequest request) {
        return services.update(self(auth).getId(), serviceId, request);
    }

    @DeleteMapping("/services/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(Authentication auth, @PathVariable Long serviceId) {
        services.delete(self(auth).getId(), serviceId);
    }

    @GetMapping("/availability")
    public AvailabilityView availability(Authentication auth) {
        return availability.get(self(auth).getId());
    }

    @PutMapping("/availability")
    public AvailabilityView replaceWeekly(Authentication auth, @Valid @RequestBody WeeklyRequest request) {
        return availability.replaceWeekly(self(auth).getId(), request.rules());
    }

    @PostMapping("/time-off")
    @ResponseStatus(HttpStatus.CREATED)
    public TimeOffView addTimeOff(Authentication auth, @Valid @RequestBody TimeOffRequest request) {
        return availability.addTimeOff(self(auth).getId(), request);
    }

    @DeleteMapping("/time-off/{timeOffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimeOff(Authentication auth, @PathVariable Long timeOffId) {
        availability.deleteTimeOff(self(auth).getId(), timeOffId);
    }

    /** {@code GET /api/provider/appointments?from=2026-10-26&to=2026-11-01} */
    @GetMapping("/appointments")
    public List<ProviderAppointmentView> appointments(
            Authentication auth,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return appointments.forProvider(self(auth).getId(), from, to);
    }

    @PatchMapping("/appointments/{id}/status")
    public AppointmentView changeStatus(Authentication auth, @PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return appointments.changeStatus(self(auth).getId(), id, request.status());
    }

    @GetMapping("/stats")
    public StatsView stats(Authentication auth) {
        return stats.stats(self(auth).getId());
    }

    private ProviderProfile self(Authentication auth) {
        return providers.findByUserEmailIgnoreCase(auth.getName())
                .orElseThrow(() -> new NotFoundException("Mütəxəssis profili tapılmadı"));
    }
}
