package az.planera.push;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** VAPID keys in the web-push CLI format, and a random pair when none are set (#55). */
class VapidKeysTest {

    // A throw-away pair generated for this test, never used anywhere else.
    static final String PUBLIC = "BAoEL5HIQMTiUgReNfYCOlWy-ylIJsfTQT0mhEjmi64-n0sqDjQzEUFRtXEoeY6A6SjzxQTsbOHs5JyB34Qxs_g";
    static final String PRIVATE = "2uyd8BuAUMwRo_iWNtGRjChKFBRTiPdQnQjNYrWsTmw";

    @Test
    void configuredKeysAreExposedAsGiven() {
        VapidKeys keys = new VapidKeys(PUBLIC, PRIVATE, "mailto:test@planera.az");

        assertThat(keys.publicKey()).isEqualTo(PUBLIC);
        assertThat(keys.subject()).isEqualTo("mailto:test@planera.az");
        assertThat(keys.keyPair().extractPublicKeyInUncompressedForm()).hasSize(65);
    }

    @Test
    void plainBase64WithPaddingIsAccepted() {
        String plainPublic = PUBLIC.replace('-', '+').replace('_', '/') + "=";
        String plainPrivate = PRIVATE.replace('-', '+').replace('_', '/') + "=";

        assertThat(new VapidKeys(plainPublic, plainPrivate, "mailto:test@planera.az").publicKey()).isEqualTo(PUBLIC);
    }

    @Test
    void withoutConfigurationARandomPairIsGenerated() {
        VapidKeys first = new VapidKeys("", "", "mailto:test@planera.az");
        VapidKeys second = new VapidKeys(" ", "", "mailto:test@planera.az");

        assertThat(first.publicKey()).hasSize(87).startsWith("B");
        assertThat(second.publicKey()).isNotEqualTo(first.publicKey());
    }
}
