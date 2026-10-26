package az.randevum.review;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class ReviewDtos {

    private ReviewDtos() {}

    /** A customer's review as shown on the provider page; the name is shortened to "Aynur Q.". */
    public record ReviewView(Long id, int rating, String comment, String customerName, Instant createdAt) {}

    public record CreateRequest(
            @Min(value = 1, message = "Reytinq 1-5 arası olmalıdır")
            @Max(value = 5, message = "Reytinq 1-5 arası olmalıdır")
            int rating,
            @Size(max = 1000) String comment) {}
}
