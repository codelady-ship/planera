package az.planera.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;

import az.planera.category.CategoryController;
import az.planera.category.CategoryDtos.CategoryView;
import az.planera.category.CategoryService;
import az.planera.common.NotFoundException;
import az.planera.common.PageResponse;
import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.provider.ProviderDtos.ProviderSummary;
import java.math.BigDecimal;
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

@WebMvcTest({CategoryController.class, ProviderController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class CatalogControllerTest {

    @Autowired MockMvcTester mvc;

    @MockitoBean CategoryService categories;
    @MockitoBean ProviderService providers;
    @MockitoBean ServiceOfferingService services;

    @Test
    void categoriesArePublic() {
        given(categories.list()).willReturn(List.of(new CategoryView("gozellik", "Gözəllik və baxım", null, 2)));

        assertThat(mvc.get().uri("/api/categories"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].providerCount")
                .isEqualTo(2);
    }

    @Test
    void searchBindsQueryParameters() {
        ProviderSummary card = new ProviderSummary(
                "elvin-barber", "Elvin Məmmədov", "Bərbər", "gozellik", "Gözəllik və baxım", "Bakı",
                new BigDecimal("4.90"), 214, new BigDecimal("10.00"), "EM", null);
        given(providers.search(argThat(s -> "gozellik".equals(s.category())
                        && "Bakı".equals(s.city())
                        && new BigDecimal("30").equals(s.maxPrice())
                        && "price".equals(s.sort()))))
                .willReturn(new PageResponse<>(List.of(card), 0, 12, 1, 1));

        assertThat(mvc.get().uri("/api/providers?category=gozellik&city=Bakı&maxPrice=30&sort=price"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.content[0].slug")
                .isEqualTo("elvin-barber");
    }

    @Test
    void unknownProviderIsA404Problem() {
        given(providers.detail("yoxdur")).willThrow(new NotFoundException("Mütəxəssis tapılmadı: yoxdur"));

        assertThat(mvc.get().uri("/api/providers/yoxdur"))
                .hasStatus(HttpStatus.NOT_FOUND)
                .bodyJson()
                .extractingPath("$.detail")
                .isEqualTo("Mütəxəssis tapılmadı: yoxdur");
    }

    @Test
    void adminEndpointsRequireAuthentication() {
        assertThat(mvc.post().uri("/api/admin/categories").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void adminEndpointsRequireTheAdminRole() {
        assertThat(mvc.delete().uri("/api/admin/categories/gozellik")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanCreateCategory() {
        given(categories.create(any())).willReturn(new CategoryView("idman", "İdman", null, 0));

        assertThat(mvc.post()
                        .uri("/api/admin/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"slug\":\"idman\",\"name\":\"İdman\",\"sortOrder\":5}"))
                .hasStatus(HttpStatus.CREATED);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidServiceIsA400WithFieldErrors() {
        assertThat(mvc.post()
                        .uri("/api/admin/providers/1/services")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"price\":-1,\"durationMinutes\":2}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors.durationMinutes")
                .isEqualTo("Ən azı 5 dəqiqə");
    }
}
