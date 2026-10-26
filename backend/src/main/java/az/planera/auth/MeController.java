package az.planera.auth;

import az.planera.auth.AuthDtos.UserView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's own profile (#32). */
@RestController
@RequestMapping("/api/me")
public class MeController {

    private final AuthService auth;

    public MeController(AuthService auth) {
        this.auth = auth;
    }

    public record ProfileRequest(
            @NotBlank @Size(max = 120) String fullName,
            @Pattern(regexp = "^\\+?[0-9 ()-]{7,20}$", message = "Telefon nömrəsi düzgün deyil") String phone) {}

    @GetMapping
    public UserView me(Authentication authentication) {
        return auth.view(authentication.getName());
    }

    @PatchMapping
    public UserView update(Authentication authentication, @Valid @RequestBody ProfileRequest request) {
        return auth.updateProfile(authentication.getName(), request.fullName(), request.phone());
    }
}
