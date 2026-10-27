package az.planera.availability;

import az.planera.availability.AvailabilityDtos.AvailabilityView;
import az.planera.availability.AvailabilityDtos.RuleRequest;
import az.planera.availability.AvailabilityDtos.TimeOffRequest;
import az.planera.availability.AvailabilityDtos.TimeOffView;
import az.planera.common.BusinessRuleException;
import az.planera.common.Messages;
import az.planera.common.NotFoundException;
import az.planera.domain.AvailabilityRule;
import az.planera.domain.AvailabilityRuleRepository;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.TimeOff;
import az.planera.domain.TimeOffRepository;
import az.planera.provider.ProviderService;
import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Weekly working hours and days off of a provider (#17). Times are local to
 * Asia/Baku. Overlapping intervals or days off are rejected with 422.
 */
@Service
@Transactional
public class AvailabilityService {

    private final ProviderProfileRepository providers;
    private final AvailabilityRuleRepository rules;
    private final TimeOffRepository timeOff;
    private final ApplicationEventPublisher events;

    public AvailabilityService(
            ProviderProfileRepository providers,
            AvailabilityRuleRepository rules,
            TimeOffRepository timeOff,
            ApplicationEventPublisher events) {
        this.providers = providers;
        this.rules = rules;
        this.timeOff = timeOff;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public AvailabilityView get(Long providerId) {
        ProviderProfile provider = provider(providerId);
        return new AvailabilityView(
                provider.getSlotStepMinutes(),
                ProviderService.schedule(rules.findByProviderIdOrderByDayOfWeekAscStartTimeAsc(providerId)),
                timeOff.findByProviderIdOrderByStartsOnAsc(providerId).stream().map(AvailabilityService::view).toList());
    }

    public AvailabilityView replaceWeekly(Long providerId, List<RuleRequest> requested) {
        ProviderProfile provider = provider(providerId);
        List<RuleRequest> sorted = requested.stream()
                .sorted(Comparator.comparingInt(RuleRequest::day).thenComparing(RuleRequest::start))
                .toList();
        RuleRequest previous = null;
        for (RuleRequest r : sorted) {
            if (!r.start().isBefore(r.end())) {
                throw new BusinessRuleException(Messages.key("availability.startBeforeEnd"));
            }
            if (previous != null && previous.day() == r.day() && r.start().isBefore(previous.end())) {
                throw new BusinessRuleException(
                        Messages.key("availability.overlap", previous.start(), previous.end(), r.start(), r.end()));
            }
            previous = r;
        }
        rules.deleteByProviderId(providerId);
        rules.flush();
        rules.saveAll(sorted.stream()
                .map(r -> new AvailabilityRule(provider, DayOfWeek.of(r.day()), r.start(), r.end()))
                .toList());
        events.publishEvent(new AvailabilityChanged(providerId));
        return get(providerId);
    }

    public TimeOffView addTimeOff(Long providerId, TimeOffRequest request) {
        ProviderProfile provider = provider(providerId);
        if (request.endsOn().isBefore(request.startsOn())) {
            throw new BusinessRuleException(Messages.key("timeOff.endBeforeStart"));
        }
        if (!timeOff.findOverlapping(providerId, request.startsOn(), request.endsOn()).isEmpty()) {
            throw new BusinessRuleException(Messages.key("timeOff.overlap"));
        }
        TimeOff saved = timeOff.save(new TimeOff(provider, request.startsOn(), request.endsOn(), request.reason()));
        events.publishEvent(new AvailabilityChanged(providerId));
        return view(saved);
    }

    public void deleteTimeOff(Long providerId, Long timeOffId) {
        TimeOff entry = timeOff.findByIdAndProviderId(timeOffId, providerId)
                .orElseThrow(() -> new NotFoundException(Messages.key("timeOff.notFound", timeOffId)));
        timeOff.delete(entry);
        events.publishEvent(new AvailabilityChanged(providerId));
    }

    private ProviderProfile provider(Long providerId) {
        return providers.findById(providerId)
                .orElseThrow(() -> new NotFoundException(Messages.key("provider.notFound", providerId)));
    }

    private static TimeOffView view(TimeOff t) {
        return new TimeOffView(t.getId(), t.getStartsOn(), t.getEndsOn(), t.getReason());
    }

    /** Published after any schedule change so cached slots can be dropped (#77). */
    public record AvailabilityChanged(Long providerId) {}
}
