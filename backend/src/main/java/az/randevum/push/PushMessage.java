package az.randevum.push;

/**
 * What a notification shows (#55). The service worker reads the same field
 * names ({@code frontend/public/sw.js}); {@code url} opens on tap and
 * {@code tag} replaces an earlier notification with the same tag.
 */
public record PushMessage(String title, String body, String url, String tag) {

    public static PushMessage of(String title, String body, String url) {
        return new PushMessage(title, body, url, null);
    }
}
