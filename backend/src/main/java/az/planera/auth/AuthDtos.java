package az.planera.auth;

import az.planera.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email(message = "{validation.email}") @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72, message = "{validation.password}") String password,
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "{validation.phone}") String phone) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UserView(Long id, String email, String fullName, String phone, UserRole role, String providerSlug) {}

    /**
     * Tokens go to the Next.js server (BFF), which keeps them in httpOnly
     * cookies on the site's own domain; the browser never sees them.
     */
    public record TokenResponse(String accessToken, long expiresIn, String refreshToken, UserView user) {}
}
