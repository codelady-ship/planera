package az.planera.slot;

import az.planera.slot.SlotService.AvailableDatesView;
import az.planera.slot.SlotService.SlotsView;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Public booking calendar (#19): active days of a month, then the free times of a day. */
@RestController
public class SlotController {

    private final SlotService slots;

    public SlotController(SlotService slots) {
        this.slots = slots;
    }

    /** {@code GET /api/providers/elvin-barber/slots?serviceId=1&date=2026-10-27} */
    @GetMapping("/api/providers/{slug}/slots")
    public SlotsView slots(
            @PathVariable String slug,
            @RequestParam Long serviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return slots.slots(slug, serviceId, date);
    }

    /** {@code GET /api/providers/elvin-barber/available-dates?serviceId=1&month=2026-10} */
    @GetMapping("/api/providers/{slug}/available-dates")
    public AvailableDatesView availableDates(
            @PathVariable String slug,
            @RequestParam Long serviceId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
        return slots.availableDates(slug, serviceId, month);
    }
}
