package az.planera.waitlist;

import az.planera.waitlist.WaitlistDtos.JoinRequest;
import az.planera.waitlist.WaitlistDtos.WaitlistView;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in customer's waitlist entries (#45). */
@RestController
@RequestMapping("/api/me/waitlist")
public class WaitlistController {

    private final WaitlistService waitlist;

    public WaitlistController(WaitlistService waitlist) {
        this.waitlist = waitlist;
    }

    @GetMapping
    public List<WaitlistView> mine(Authentication auth) {
        return waitlist.mine(auth.getName());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WaitlistView join(Authentication auth, @Valid @RequestBody JoinRequest request) {
        return waitlist.join(auth.getName(), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(Authentication auth, @PathVariable Long id) {
        waitlist.leave(auth.getName(), id);
    }
}
