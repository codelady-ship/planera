package az.planera.category;

import az.planera.category.CategoryDtos.CategoryRequest;
import az.planera.category.CategoryDtos.CategoryView;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping("/api/categories")
    public List<CategoryView> list() {
        return service.list();
    }

    @PostMapping("/api/admin/categories")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryView create(@Valid @RequestBody CategoryRequest request) {
        return service.create(request);
    }

    @PutMapping("/api/admin/categories/{slug}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryView update(@PathVariable String slug, @Valid @RequestBody CategoryRequest request) {
        return service.update(slug, request);
    }

    @DeleteMapping("/api/admin/categories/{slug}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String slug) {
        service.delete(slug);
    }
}
