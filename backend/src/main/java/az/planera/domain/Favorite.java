package az.planera.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A provider a customer marked as favourite (#46); one row per pair. */
@Entity
@Table(name = "favorites")
public class Favorite extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    protected Favorite() {}

    public Favorite(User user, ProviderProfile provider) {
        this.user = user;
        this.provider = provider;
    }

    public User getUser() { return user; }
    public ProviderProfile getProvider() { return provider; }
}
