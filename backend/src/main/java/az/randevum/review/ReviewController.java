package az.randevum.review;

import az.randevum.common.PageResponse;
import az.randevum.review.ReviewDtos.CreateRequest;
import az.randevum.review.ReviewDtos.ReviewView;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Reviews (#44): the customer writes one after a completed appointment; everyone reads them. */
@RestController
public class ReviewController {

    private final ReviewService reviews;

    public ReviewController(ReviewService reviews) {
        this.reviews = reviews;
    }

    @PostMapping("/api/appointments/{id}/review")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewView create(Authentication auth, @PathVariable Long id, @Valid @RequestBody CreateRequest request) {
        return reviews.create(auth.getName(), id, request);
    }

    /** Public, newest first. */
    @GetMapping("/api/providers/{slug}/reviews")
    public PageResponse<ReviewView> list(
            @PathVariable String slug,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return reviews.forProvider(slug, page, size);
    }
}
