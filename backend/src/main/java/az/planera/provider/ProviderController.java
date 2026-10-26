package az.planera.provider;

import az.planera.common.PageResponse;
import az.planera.provider.ProviderDtos.ProviderDetail;
import az.planera.provider.ProviderDtos.ProviderSummary;
import az.planera.provider.ProviderDtos.ServiceRequest;
import az.planera.provider.ProviderDtos.ServiceView;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Public catalog plus admin management of a provider's services. Providers
 * manage their own services once authentication lands (#25, #26).
 */
@RestController
public class ProviderController {

    private final ProviderService providers;
    private final ServiceOfferingService services;

    public ProviderController(ProviderService providers, ServiceOfferingService services) {
        this.providers = providers;
        this.services = services;
    }

    /** Query parameters bind onto {@link ProviderSearch}: category, city, q, minPrice, maxPrice, minRating, sort, page, size. */
    @GetMapping("/api/providers")
    public PageResponse<ProviderSummary> search(ProviderSearch search) {
        return providers.search(search);
    }

    @GetMapping("/api/providers/{slug}")
    public ProviderDetail detail(@PathVariable String slug) {
        return providers.detail(slug);
    }

    @GetMapping("/api/providers/{slug}/services")
    public List<ServiceView> services(@PathVariable String slug) {
        return providers.services(slug);
    }

    @GetMapping("/api/admin/providers/{providerId}/services")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ServiceView> adminServices(@PathVariable Long providerId) {
        return services.list(providerId);
    }

    @PostMapping("/api/admin/providers/{providerId}/services")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceView createService(@PathVariable Long providerId, @Valid @RequestBody ServiceRequest request) {
        return services.create(providerId, request);
    }

    @PutMapping("/api/admin/providers/{providerId}/services/{serviceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ServiceView updateService(
            @PathVariable Long providerId, @PathVariable Long serviceId, @Valid @RequestBody ServiceRequest request) {
        return services.update(providerId, serviceId, request);
    }

    @DeleteMapping("/api/admin/providers/{providerId}/services/{serviceId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable Long providerId, @PathVariable Long serviceId) {
        services.delete(providerId, serviceId);
    }
}
