package az.planera.provider;

import az.planera.review.ReviewDtos.ReviewView;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

public final class ProviderDtos {

    private ProviderDtos() {}

    /** One card in the catalog. {@code nextSlot} is filled once slots exist (#19). */
    public record ProviderSummary(
            String slug,
            String name,
            String title,
            String category,
            String categoryName,
            String city,
            BigDecimal rating,
            int reviewCount,
            BigDecimal priceFrom,
            String initials,
            String nextSlot) {}

    public record ServiceView(
            Long id, String name, String description, BigDecimal price, int durationMinutes) {}

    public record Interval(LocalTime start, LocalTime end) {}

    /** ISO day number (1 = Monday) with its working intervals; empty = day off. */
    public record DaySchedule(int day, List<Interval> intervals) {}

    /** {@code reviews} holds the newest ones (#44); the full list is paged at /reviews. */
    public record ProviderDetail(
            ProviderSummary summary,
            String bio,
            String address,
            String phone,
            int cancellationHours,
            List<ServiceView> services,
            List<DaySchedule> schedule,
            List<ReviewView> reviews) {}

    public record ServiceRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 500) String description,
            @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal price,
            @Min(value = 5, message = "Ən azı 5 dəqiqə") @Max(value = 600, message = "Ən çox 600 dəqiqə") int durationMinutes,
            Boolean active) {}
}
