package az.randevum.push;

import com.zerodeplibs.webpush.VAPIDKeyPair;
import com.zerodeplibs.webpush.VAPIDKeyPairs;
import com.zerodeplibs.webpush.key.PrivateKeySources;
import com.zerodeplibs.webpush.key.PublicKeySources;
import java.math.BigInteger;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The server's VAPID key pair (#55), read from {@code VAPID_PUBLIC_KEY} and
 * {@code VAPID_PRIVATE_KEY} in the format {@code web-push generate-vapid-keys}
 * prints (base64url: 65-byte uncompressed public point, 32-byte private
 * scalar). Without them a random pair is used, like the JWT secret, so
 * local runs work but subscriptions stop matching after a restart.
 */
@Component
public class VapidKeys {

    private static final Logger log = LoggerFactory.getLogger(VapidKeys.class);
    private static final String CURVE = "secp256r1";

    private final VAPIDKeyPair keyPair;
    private final String subject;
    private final String publicKey;

    public VapidKeys(
            @Value("${randevum.push.vapid.public-key:}") String publicKey,
            @Value("${randevum.push.vapid.private-key:}") String privateKey,
            @Value("${randevum.push.vapid.subject:mailto:info@randevum.az}") String subject) {
        this.subject = subject;
        if (publicKey.isBlank() || privateKey.isBlank()) {
            KeyPair generated = generate();
            this.keyPair = VAPIDKeyPairs.of(
                    PrivateKeySources.ofECPrivateKey((ECPrivateKey) generated.getPrivate()),
                    PublicKeySources.ofECPublicKey((ECPublicKey) generated.getPublic()));
            log.warn("VAPID keys are not configured: using a random pair, push subscriptions reset on every start. "
                    + "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
        } else {
            byte[] secret = decode(privateKey);
            this.keyPair = VAPIDKeyPairs.of(
                    secret.length == 32
                            ? PrivateKeySources.ofECPrivateKey(privateKey(secret))
                            : PrivateKeySources.ofPKCS8Bytes(secret),
                    PublicKeySources.ofUncompressedBytes(decode(publicKey)));
        }
        this.publicKey = Base64.getUrlEncoder().withoutPadding().encodeToString(keyPair.extractPublicKeyInUncompressedForm());
    }

    public VAPIDKeyPair keyPair() { return keyPair; }

    /** {@code mailto:} or https URL the push service may contact about abuse. */
    public String subject() { return subject; }

    /** Base64url without padding, as {@code pushManager.subscribe} wants it. */
    public String publicKey() { return publicKey; }

    /** Accepts base64url or plain base64, with or without padding. */
    static byte[] decode(String text) {
        String normalized = text.trim().replace('+', '-').replace('/', '_').replace("=", "");
        return Base64.getUrlDecoder().decode(normalized);
    }

    private static ECPrivateKey privateKey(byte[] scalar) {
        try {
            AlgorithmParameters parameters = AlgorithmParameters.getInstance("EC");
            parameters.init(new ECGenParameterSpec(CURVE));
            ECParameterSpec curve = parameters.getParameterSpec(ECParameterSpec.class);
            return (ECPrivateKey) KeyFactory.getInstance("EC")
                    .generatePrivate(new ECPrivateKeySpec(new BigInteger(1, scalar), curve));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("VAPID_PRIVATE_KEY is not a P-256 private key", e);
        }
    }

    private static KeyPair generate() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
            generator.initialize(new ECGenParameterSpec(CURVE));
            return generator.generateKeyPair();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot generate a P-256 key pair", e);
        }
    }
}
