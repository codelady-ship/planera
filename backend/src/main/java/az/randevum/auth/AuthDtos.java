package az.randevum.auth;

import az.randevum.domain.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email(message = "E-poçt düzgün deyil") @Size(max = 255) String email,
            @NotBlank @Size(min = 8, max = 72, message = "Şifrə 8-72 simvol olmalıdır") String password,
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Telefon nömrəsi düzgün deyil") String phone) {}

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record UserView(Long id, String email, String fullName, String phone, UserRole role, String providerSlug) {}

    /**
     * Tokens go to the Next.js server (BFF), which keeps them in httpOnly
     * cookies on the site's own domain; the browser never sees them.
     */
    public record TokenResponse(String accessToken, long expiresIn, String refreshToken, UserView user) {}
}
