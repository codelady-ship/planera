package az.randevum.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import az.randevum.common.ConflictException;
import az.randevum.common.PageResponse;
import az.randevum.config.JwtConfig;
import az.randevum.config.SecurityConfig;
import az.randevum.review.ReviewDtos.ReviewView;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(ReviewController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class ReviewControllerTest {

    static final ReviewView VIEW = new ReviewView(1L, 5, "Əla", "Aynur Q.", Instant.parse("2026-10-26T10:00:00Z"));

    @Autowired MockMvcTester mvc;

    @MockitoBean ReviewService reviews;

    @Test
    void readingIsPublicWritingIsNot() {
        given(reviews.forProvider("elvin-barber", 0, 10)).willReturn(new PageResponse<>(List.of(VIEW), 0, 10, 1, 1));

        assertThat(mvc.get().uri("/api/providers/elvin-barber/reviews"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.content[0].customerName")
                .isEqualTo("Aynur Q.");
        assertThat(mvc.post().uri("/api/appointments/1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5}"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void aReviewIsA201ForItsCustomer() {
        given(reviews.create(eq("musteri@randevum.az"), eq(7L), argThat(r -> r.rating() == 5 && "Əla".equals(r.comment()))))
                .willReturn(VIEW);

        assertThat(mvc.post().uri("/api/appointments/7/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"Əla\"}"))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.rating")
                .isEqualTo(5);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void ratingOutsideOneToFiveIsA400() {
        assertThat(mvc.post().uri("/api/appointments/7/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":6}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors.rating")
                .isEqualTo("Reytinq 1-5 arası olmalıdır");
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void aSecondReviewIsA409() {
        given(reviews.create(eq("musteri@randevum.az"), eq(7L), argThat(r -> r.rating() == 4)))
                .willThrow(new ConflictException("Bu randevuya artıq rəy yazılıb"));

        assertThat(mvc.post().uri("/api/appointments/7/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4}"))
                .hasStatus(HttpStatus.CONFLICT);
    }
}
