package az.planera.provider;

import az.planera.common.NotFoundException;
import az.planera.common.PageResponse;
import az.planera.domain.AvailabilityRule;
import az.planera.domain.AvailabilityRuleRepository;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.ServiceOffering;
import az.planera.domain.ServiceOfferingRepository;
import az.planera.provider.ProviderDtos.DaySchedule;
import az.planera.provider.ProviderDtos.Interval;
import az.planera.provider.ProviderDtos.ProviderDetail;
import az.planera.provider.ProviderDtos.ProviderSummary;
import az.planera.provider.ProviderDtos.ServiceView;
import az.planera.review.ReviewService;
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
    private final ReviewService reviews;

    public ProviderService(
            ProviderProfileRepository providers,
            ServiceOfferingRepository services,
            AvailabilityRuleRepository rules,
            ReviewService reviews) {
        this.providers = providers;
        this.services = services;
        this.rules = rules;
        this.reviews = reviews;
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
                schedule(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(p.getId())),
                reviews.latest(p.getId()));
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
