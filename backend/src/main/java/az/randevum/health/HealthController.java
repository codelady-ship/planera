package az.randevum.health;

import java.time.Clock;
import java.time.OffsetDateTime;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Lightweight liveness endpoint for the frontend and uptime checks. */
@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final Clock clock;

    public HealthController(Clock clock) {
        this.clock = clock;
    }

    @GetMapping
    public HealthResponse health() {
        return new HealthResponse("UP", "randevum-api", OffsetDateTime.now(clock));
    }

    public record HealthResponse(String status, String service, OffsetDateTime time) {}
}
