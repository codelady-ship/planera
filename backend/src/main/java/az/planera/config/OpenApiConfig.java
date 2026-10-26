package az.planera.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI description served at /v3/api-docs and browsed at /swagger-ui.html
 * (#51). Swagger UI is read-only in production: no "try it out", see
 * application.yml.
 */
@Configuration
public class OpenApiConfig {

    static final String BEARER = "bearer";

    @Bean
    OpenAPI planeraOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Planera API")
                        .version("v1")
                        .description("Onlayn randevu platforması: kataloq, boş saatlar, randevular, rəylər, "
                                + "şəxsi qeydlər və bildirişlər. Vaxt zonası Asia/Baku, qiymətlər AZN."))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("POST /api/auth/login cavabındakı accessToken")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }
}
