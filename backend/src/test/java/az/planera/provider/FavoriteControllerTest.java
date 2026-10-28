package az.planera.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.provider.ProviderDtos.ProviderSummary;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(FavoriteController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class FavoriteControllerTest {

    static final ProviderSummary ELVIN = new ProviderSummary(
            "elvin-barber", "Elvin Məmmədov", "Bərbər", "gozellik", "Gözəllik və baxım", "Bakı",
            new BigDecimal("4.80"), 12, new BigDecimal("15.00"), "EM", null);

    @Autowired MockMvcTester mvc;

    @MockitoBean FavoriteService favorites;

    @Test
    void favouritesNeedASession() {
        assertThat(mvc.get().uri("/api/me/favorites")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(mvc.put().uri("/api/me/favorites/elvin-barber")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void listsAddsAndRemovesForTheSignedInUser() {
        given(favorites.list("musteri@planera.az")).willReturn(List.of(ELVIN));

        assertThat(mvc.get().uri("/api/me/favorites"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].slug")
                .isEqualTo("elvin-barber");
        assertThat(mvc.put().uri("/api/me/favorites/elvin-barber")).hasStatus(HttpStatus.NO_CONTENT);
        Mockito.verify(favorites).add("musteri@planera.az", "elvin-barber");
        assertThat(mvc.delete().uri("/api/me/favorites/elvin-barber")).hasStatus(HttpStatus.NO_CONTENT);
        Mockito.verify(favorites).remove("musteri@planera.az", "elvin-barber");
    }
}
