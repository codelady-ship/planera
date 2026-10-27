package az.planera.review;

import az.planera.common.BusinessRuleException;
import az.planera.common.ConflictException;
import az.planera.common.Messages;
import az.planera.common.NotFoundException;
import az.planera.common.PageResponse;
import az.planera.domain.Appointment;
import az.planera.domain.AppointmentRepository;
import az.planera.domain.AppointmentStatus;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.Review;
import az.planera.domain.ReviewRepository;
import az.planera.review.ReviewDtos.CreateRequest;
import az.planera.review.ReviewDtos.ReviewView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Customer reviews (#44): one per completed appointment, by its customer.
 * The provider's average is kept on the profile and updated incrementally,
 * so the demo ratings seeded with the catalog keep counting.
 */
@Service
@Transactional
public class ReviewService {

    static final int LATEST = 10;
    static final int MAX_PAGE = 50;

    private final ReviewRepository reviews;
    private final AppointmentRepository appointments;
    private final ProviderProfileRepository providers;

    public ReviewService(
            ReviewRepository reviews, AppointmentRepository appointments, ProviderProfileRepository providers) {
        this.reviews = reviews;
        this.appointments = appointments;
        this.providers = providers;
    }

    public ReviewView create(String email, Long appointmentId, CreateRequest request) {
        Appointment a = appointments.findById(appointmentId)
                .orElseThrow(() -> new NotFoundException(Messages.key("appointment.notFound", appointmentId)));
        if (!a.getCustomer().getEmail().equalsIgnoreCase(email)) {
            throw new AccessDeniedException("Bu randevu sizə aid deyil");
        }
        if (a.getStatus() != AppointmentStatus.COMPLETED) {
            throw new BusinessRuleException(Messages.key("review.onlyCompleted"));
        }
        if (reviews.existsByAppointmentId(appointmentId)) {
            throw new ConflictException(Messages.key("review.exists"));
        }
        String comment = request.comment() == null ? null : request.comment().strip();
        Review review = reviews.save(new Review(a, request.rating(), comment == null || comment.isEmpty() ? null : comment));

        ProviderProfile p = a.getProvider();
        BigDecimal total = p.getRatingAvg().multiply(BigDecimal.valueOf(p.getRatingCount()))
                .add(BigDecimal.valueOf(request.rating()));
        p.setRatingCount(p.getRatingCount() + 1);
        p.setRatingAvg(total.divide(BigDecimal.valueOf(p.getRatingCount()), 2, RoundingMode.HALF_UP));
        return view(review);
    }

    @Transactional(readOnly = true)
    public PageResponse<ReviewView> forProvider(String slug, int page, int size) {
        ProviderProfile p = providers.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException(Messages.key("provider.notFound", slug)));
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE));
        return PageResponse.of(reviews.findByProviderIdOrderByCreatedAtDesc(p.getId(), pageable), ReviewService::view);
    }

    /** The newest reviews for the provider page. */
    @Transactional(readOnly = true)
    public List<ReviewView> latest(Long providerId) {
        return reviews.findByProviderIdOrderByCreatedAtDesc(providerId, PageRequest.of(0, LATEST)).stream()
                .map(ReviewService::view)
                .toList();
    }

    public static ReviewView view(Review r) {
        return new ReviewView(r.getId(), r.getRating(), r.getComment(), shortName(r.getCustomer().getFullName()), r.getCreatedAt());
    }

    /** "Aynur Qasımova" -> "Aynur Q." so the provider page shows no full names. */
    static String shortName(String fullName) {
        String[] parts = fullName.strip().split("\\s+");
        if (parts.length < 2) {
            return parts[0];
        }
        return parts[0] + " " + parts[parts.length - 1].charAt(0) + ".";
    }
}
