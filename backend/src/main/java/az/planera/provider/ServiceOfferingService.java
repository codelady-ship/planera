package az.planera.provider;

import az.planera.common.NotFoundException;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.provider.ProviderDtos.ServiceRequest;
import az.planera.provider.ProviderDtos.ServiceView;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages a provider's services. Every change re-derives the provider's
 * {@code priceFrom}, which the catalog filters and sorts on.
 */
@Service
@Transactional
public class ServiceOfferingService {

    private final ProviderProfileRepository providers;
    private final ServiceOfferingRepository services;

    public ServiceOfferingService(ProviderProfileRepository providers, ServiceOfferingRepository services) {
        this.providers = providers;
        this.services = services;
    }

    @Transactional(readOnly = true)
    public List<ServiceView> list(Long providerId) {
        provider(providerId);
        return services.findByProviderIdAndActiveTrueOrderByPriceAsc(providerId).stream().map(ProviderService::view).toList();
    }

    public ServiceView create(Long providerId, ServiceRequest request) {
        ProviderProfile provider = provider(providerId);
        ServiceOffering service = new ServiceOffering(provider, request.name(), request.price(), request.durationMinutes());
        apply(service, request);
        services.saveAndFlush(service);
        refreshPriceFrom(provider);
        return ProviderService.view(service);
    }

    public ServiceView update(Long providerId, Long serviceId, ServiceRequest request) {
        ServiceOffering service = service(providerId, serviceId);
        service.setName(request.name());
        service.setPrice(request.price());
        service.setDurationMinutes(request.durationMinutes());
        apply(service, request);
        services.flush();
        refreshPriceFrom(service.getProvider());
        return ProviderService.view(service);
    }

    /**
     * Deactivates instead of deleting: past appointments keep pointing at the
     * service and its price.
     */
    public void delete(Long providerId, Long serviceId) {
        ServiceOffering service = service(providerId, serviceId);
        service.setActive(false);
        services.flush();
        refreshPriceFrom(service.getProvider());
    }

    private void refreshPriceFrom(ProviderProfile provider) {
        provider.setPriceFrom(services.findMinActivePrice(provider.getId()).orElse(null));
    }

    private static void apply(ServiceOffering service, ServiceRequest request) {
        service.setDescription(request.description());
        if (request.active() != null) {
            service.setActive(request.active());
        }
    }

    private ProviderProfile provider(Long providerId) {
        return providers.findById(providerId)
                .orElseThrow(() -> new NotFoundException("Mütəxəssis tapılmadı: " + providerId));
    }

    private ServiceOffering service(Long providerId, Long serviceId) {
        return services.findByIdAndProviderId(serviceId, providerId)
                .orElseThrow(() -> new NotFoundException("Xidmət tapılmadı: " + serviceId));
    }
}
