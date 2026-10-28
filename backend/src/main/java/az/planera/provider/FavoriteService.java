package az.planera.provider;

import az.planera.common.Messages;
import az.planera.common.NotFoundException;
import az.planera.domain.Favorite;
import az.planera.domain.FavoriteRepository;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.provider.ProviderDtos.ProviderSummary;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Favourite providers of a customer (#46): add, remove and list as catalog cards. */
@Service
@Transactional
public class FavoriteService {

    private final FavoriteRepository favorites;
    private final ProviderProfileRepository providers;
    private final UserRepository users;

    public FavoriteService(FavoriteRepository favorites, ProviderProfileRepository providers, UserRepository users) {
        this.favorites = favorites;
        this.providers = providers;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ProviderSummary> list(String email) {
        return favorites.findByUserIdOrderByCreatedAtDesc(user(email).getId()).stream()
                .map(Favorite::getProvider)
                .filter(ProviderProfile::isActive)
                .map(ProviderService::summary)
                .toList();
    }

    /** Idempotent: adding twice keeps one row. */
    public void add(String email, String slug) {
        User user = user(email);
        ProviderProfile provider = provider(slug);
        if (!favorites.existsByUserIdAndProviderId(user.getId(), provider.getId())) {
            favorites.save(new Favorite(user, provider));
        }
    }

    /** Idempotent: removing a provider that is not a favourite is fine. */
    public void remove(String email, String slug) {
        favorites.deleteByUserIdAndProviderId(user(email).getId(), provider(slug).getId());
    }

    private User user(String email) {
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException(Messages.key("user.notFound")));
    }

    private ProviderProfile provider(String slug) {
        return providers.findBySlugAndActiveTrue(slug)
                .orElseThrow(() -> new NotFoundException(Messages.key("provider.notFound", slug)));
    }
}
