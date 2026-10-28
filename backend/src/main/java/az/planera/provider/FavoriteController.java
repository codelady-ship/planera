package az.planera.provider;

import az.planera.provider.ProviderDtos.ProviderSummary;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's favourite providers (#46). */
@RestController
@RequestMapping("/api/me/favorites")
public class FavoriteController {

    private final FavoriteService favorites;

    public FavoriteController(FavoriteService favorites) {
        this.favorites = favorites;
    }

    @GetMapping
    public List<ProviderSummary> list(Authentication auth) {
        return favorites.list(auth.getName());
    }

    @PutMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void add(Authentication auth, @PathVariable String slug) {
        favorites.add(auth.getName(), slug);
    }

    @DeleteMapping("/{slug}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(Authentication auth, @PathVariable String slug) {
        favorites.remove(auth.getName(), slug);
    }
}
