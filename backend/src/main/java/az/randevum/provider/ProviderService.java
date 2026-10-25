package az.randevum.provider;

import az.randevum.common.NotFoundException;
import az.randevum.common.PageResponse;
import az.randevum.domain.AvailabilityRule;
import az.randevum.domain.AvailabilityRuleRepository;
import az.randevum.domain.ProviderProfile;
import az.randevum.domain.ProviderProfileRepository;
import az.randevum.domain.ServiceOffering;
import az.randevum.domain.ServiceOfferingRepository;
import az.randevum.provider.ProviderDtos.DaySchedule;
import az.randevum.provider.ProviderDtos.Interval;
import az.randevum.provider.ProviderDtos.ProviderDetail;
import az.randevum.provider.ProviderDtos.ProviderSummary;
import az.randevum.provider.ProviderDtos.ServiceView;
import java.time.DayOfWeek;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProviderService {

    private final ProviderProfileRepository providers;
    private final ServiceOfferingRepository services;
    private final AvailabilityRuleRepository rules;

    public ProviderService(
            ProviderProfileRepository providers, ServiceOfferingRepository services, AvailabilityRuleRepository rules) {
        this.providers = providers;
        this.services = services;
        this.rules = rules;
    }

    public PageResponse<ProviderSummary> search(ProviderSearch search) {
        return PageResponse.of(
                providers.findAll(search.toSpecification(), search.toPageable()), ProviderService::summary);
    }

    public ProviderDetail detail(String slug) {
        ProviderProfile p = get(slug);
        return new ProviderDetail(
                summary(p),
                p.getBio(),
                p.getAddress(),
                p.getPhone(),
                p.getCancellationHours(),
                activeServices(p),
                schedule(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(p.getId())));
    }

    public List<ServiceView> services(String slug) {
        return activeServices(get(slug));
    }

    ProviderProfile get(String slug) {
        return providers.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException("Mütəxəssis tapılmadı: " + slug));
    }

    private List<ServiceView> activeServices(ProviderProfile p) {
        return services.findByProviderIdAndActiveTrueOrderByPriceAsc(p.getId()).stream()
                .map(ProviderService::view)
                .toList();
    }

    /** Groups weekly rules into Monday..Sunday; a day without rules is a day off. */
    public static List<DaySchedule> schedule(List<AvailabilityRule> weekly) {
        Map<DayOfWeek, List<Interval>> byDay = weekly.stream()
                .collect(Collectors.groupingBy(
                        AvailabilityRule::getDayOfWeek,
                        Collectors.mapping(r -> new Interval(r.getStartTime(), r.getEndTime()), Collectors.toList())));
        return Arrays.stream(DayOfWeek.values())
                .map(d -> new DaySchedule(d.getValue(), byDay.getOrDefault(d, List.of())))
                .toList();
    }

    static ProviderSummary summary(ProviderProfile p) {
        return new ProviderSummary(
                p.getSlug(),
                p.getDisplayName(),
                p.getTitle(),
                p.getCategory().getSlug(),
                p.getCategory().getName(),
                p.getCity(),
                p.getRatingAvg(),
                p.getRatingCount(),
                p.getPriceFrom(),
                initials(p.getDisplayName()),
                null);
    }

    static ServiceView view(ServiceOffering s) {
        return new ServiceView(s.getId(), s.getName(), s.getDescription(), s.getPrice(), s.getDurationMinutes());
    }

    /** "Dr. Leyla Həsənova" -> "LH": first letters of the first two words that are not titles. */
    static String initials(String name) {
        return Arrays.stream(name.trim().split("\\s+"))
                .filter(w -> !w.endsWith("."))
                .limit(2)
                .map(w -> w.substring(0, 1).toUpperCase(java.util.Locale.forLanguageTag("az")))
                .collect(Collectors.joining());
    }
}
