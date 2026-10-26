package az.planera.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** A browser's Web Push subscription for one user (#55). */
@Entity
@Table(name = "push_subscriptions")
public class PushSubscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 2000)
    private String endpoint;

    @Column(nullable = false)
    private String p256dh;

    @Column(nullable = false)
    private String auth;

    /** Free text from the browser (user agent), shown in the device list. */
    @Column(length = 200)
    private String device;

    protected PushSubscription() {}

    public PushSubscription(User user, String endpoint, String p256dh, String auth, String device) {
        this.user = user;
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.device = device;
    }

    public User getUser() { return user; }
    public String getEndpoint() { return endpoint; }
    public String getP256dh() { return p256dh; }
    public String getAuth() { return auth; }
    public String getDevice() { return device; }

    /** The same browser subscribed again: new keys, possibly a new user. */
    public void renew(User user, String p256dh, String auth, String device) {
        this.user = user;
        this.p256dh = p256dh;
        this.auth = auth;
        this.device = device;
    }
}
