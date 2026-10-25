package az.randevum.stats;

import az.randevum.stats.StatsDtos.StatsView;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Platform statistics for admins (#41); a provider reads its own at {@code /api/provider/stats}. */
@RestController
@PreAuthorize("hasRole('ADMIN')")
public class StatsController {

    private final StatsService stats;

    public StatsController(StatsService stats) {
        this.stats = stats;
    }

    /** {@code GET /api/admin/stats?providerId=3}; without providerId, the whole platform. */
    @GetMapping("/api/admin/stats")
    public StatsView stats(@RequestParam(required = false) Long providerId) {
        return stats.stats(providerId);
    }
}
