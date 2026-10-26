package az.planera.auth;

import az.planera.auth.AuthDtos.LoginRequest;
import az.planera.auth.AuthDtos.RegisterRequest;
import az.planera.auth.AuthDtos.TokenResponse;
import az.planera.auth.AuthDtos.UserView;
import az.planera.common.ConflictException;
import az.planera.common.TooManyRequestsException;
import az.planera.common.UnauthorizedException;
import az.planera.domain.ProviderProfile;
import az.planera.domain.ProviderProfileRepository;
import az.planera.domain.RefreshToken;
import az.planera.domain.RefreshTokenRepository;
import az.planera.domain.User;
import az.planera.domain.UserRepository;
import az.planera.domain.UserRole;
import az.planera.redis.RateLimiter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration, login and token rotation (#25). Access tokens are 15-minute
 * JWTs; refresh tokens are random, live 14 days, are stored hashed and are
 * replaced on every refresh. Replaying a revoked refresh token revokes all
 * of that user's tokens.
 */
@Service
// Keep the revoke-all of a replayed token even though the call ends in 401.
@Transactional(noRollbackFor = UnauthorizedException.class)
public class AuthService {

    static final Duration ACCESS_TTL = Duration.ofMinutes(15);
    static final Duration REFRESH_TTL = Duration.ofDays(14);
    static final int LOGIN_ATTEMPTS_PER_MINUTE = 5;

    private static final String BAD_CREDENTIALS = "E-poçt və ya şifrə yanlışdır";
    private static final String BAD_REFRESH = "Sessiyanın vaxtı bitib, yenidən daxil olun";

    private final UserRepository users;
    private final ProviderProfileRepository providers;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwords;
    private final JwtEncoder jwt;
    private final RateLimiter limiter;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    /** Compared against when the email is unknown, so both cases take as long. */
    private final String dummyHash;

    public AuthService(
            UserRepository users,
            ProviderProfileRepository providers,
            RefreshTokenRepository refreshTokens,
            PasswordEncoder passwords,
            JwtEncoder jwt,
            RateLimiter limiter,
            Clock clock) {
        this.users = users;
        this.providers = providers;
        this.refreshTokens = refreshTokens;
        this.passwords = passwords;
        this.jwt = jwt;
        this.limiter = limiter;
        this.clock = clock;
        this.dummyHash = passwords.encode("not-a-real-password");
    }

    public TokenResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Bu e-poçt ilə artıq hesab var");
        }
        User user = new User(email, request.fullName().strip(), UserRole.CUSTOMER);
        user.setPhone(request.phone());
        user.setPasswordHash(passwords.encode(request.password()));
        return issue(users.save(user));
    }

    public TokenResponse login(LoginRequest request) {
        String email = normalize(request.email());
        if (!limiter.allow("login:" + email, LOGIN_ATTEMPTS_PER_MINUTE, Duration.ofMinutes(1))) {
            throw new TooManyRequestsException("Çox sayda cəhd. Bir dəqiqə sonra yenidən yoxlayın.", Duration.ofMinutes(1));
        }
        User user = users.findByEmailIgnoreCase(email).orElse(null);
        String hash = user == null || user.getPasswordHash() == null ? dummyHash : user.getPasswordHash();
        boolean matches = passwords.matches(request.password(), hash);
        if (user == null || user.getPasswordHash() == null || !matches) {
            throw new UnauthorizedException(BAD_CREDENTIALS);
        }
        return issue(user);
    }

    public TokenResponse refresh(String token) {
        RefreshToken stored = refreshTokens.findByTokenHash(hash(token))
                .orElseThrow(() -> new UnauthorizedException(BAD_REFRESH));
        Instant now = clock.instant();
        if (stored.getRevokedAt() != null) {
            // A rotated token came back: it may be stolen, so end every session of the user.
            refreshTokens.revokeAll(stored.getUser().getId(), now);
            throw new UnauthorizedException(BAD_REFRESH);
        }
        if (!stored.isUsable(now)) {
            throw new UnauthorizedException(BAD_REFRESH);
        }
        stored.revoke(now);
        return issue(stored.getUser());
    }

    public void logout(String token) {
        refreshTokens.findByTokenHash(hash(token)).ifPresent(t -> t.revoke(clock.instant()));
    }

    @Transactional(readOnly = true)
    public UserView view(String email) {
        return users.findByEmailIgnoreCase(email).map(this::view)
                .orElseThrow(() -> new UnauthorizedException(BAD_REFRESH));
    }

    public UserView updateProfile(String email, String fullName, String phone) {
        User user = users.findByEmailIgnoreCase(email).orElseThrow(() -> new UnauthorizedException(BAD_REFRESH));
        user.setFullName(fullName.strip());
        user.setPhone(phone);
        return view(user);
    }

    UserView view(User user) {
        String slug = user.getRole() == UserRole.PROVIDER
                ? providers.findByUserId(user.getId()).map(ProviderProfile::getSlug).orElse(null)
                : null;
        return new UserView(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.getRole(), slug);
    }

    private TokenResponse issue(User user) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("planera")
                .subject(user.getEmail())
                .issuedAt(now)
                .expiresAt(now.plus(ACCESS_TTL))
                .claim("uid", user.getId())
                .claim("roles", List.of(user.getRole().name()))
                .build();
        String access = jwt.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new RefreshToken(user, hash(refresh), now.plus(REFRESH_TTL)));

        return new TokenResponse(access, ACCESS_TTL.toSeconds(), refresh, view(user));
    }

    private static String normalize(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
