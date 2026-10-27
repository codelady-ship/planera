package az.planera.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class CategoryDtos {

    private CategoryDtos() {}

    public record CategoryView(String slug, String name, String description, long providerCount) {}

    public record CategoryRequest(
            @NotBlank @Pattern(regexp = "[a-z0-9-]{2,60}", message = "{validation.slug}") String slug,
            @NotBlank @Size(max = 120) String name,
            @Size(max = 255) String description,
            @PositiveOrZero int sortOrder) {}
}
