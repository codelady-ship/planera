package az.planera.availability;

import az.planera.availability.AvailabilityDtos.AvailabilityView;
import az.planera.availability.AvailabilityDtos.TimeOffRequest;
import az.planera.availability.AvailabilityDtos.TimeOffView;
import az.planera.availability.AvailabilityDtos.WeeklyRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Admin management of a provider's schedule; providers get their own endpoints with #26. */
@RestController
@RequestMapping("/api/admin/providers/{providerId}")
@PreAuthorize("hasRole('ADMIN')")
public class AvailabilityController {

    private final AvailabilityService availability;

    public AvailabilityController(AvailabilityService availability) {
        this.availability = availability;
    }

    @GetMapping("/availability")
    public AvailabilityView get(@PathVariable Long providerId) {
        return availability.get(providerId);
    }

    @PutMapping("/availability")
    public AvailabilityView replaceWeekly(@PathVariable Long providerId, @Valid @RequestBody WeeklyRequest request) {
        return availability.replaceWeekly(providerId, request.rules());
    }

    @PostMapping("/time-off")
    @ResponseStatus(HttpStatus.CREATED)
    public TimeOffView addTimeOff(@PathVariable Long providerId, @Valid @RequestBody TimeOffRequest request) {
        return availability.addTimeOff(providerId, request);
    }

    @DeleteMapping("/time-off/{timeOffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTimeOff(@PathVariable Long providerId, @PathVariable Long timeOffId) {
        availability.deleteTimeOff(providerId, timeOffId);
    }
}
