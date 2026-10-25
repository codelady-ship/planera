package az.randevum.appointment;

import az.randevum.appointment.AppointmentDtos.Actor;
import az.randevum.appointment.AppointmentDtos.AppointmentView;
import az.randevum.appointment.AppointmentDtos.CancelRequest;
import az.randevum.appointment.AppointmentDtos.CreateRequest;
import az.randevum.appointment.AppointmentDtos.RescheduleRequest;
import az.randevum.appointment.AppointmentDtos.Scope;
import az.randevum.appointment.AppointmentDtos.StatusRequest;
import az.randevum.common.BusinessRuleException;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Customer bookings (#21, #22, #23). Every endpoint requires authentication. */
@RestController
public class AppointmentController {

    private final AppointmentService appointments;

    public AppointmentController(AppointmentService appointments) {
        this.appointments = appointments;
    }

    @PostMapping("/api/appointments")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentView create(Authentication auth, @Valid @RequestBody CreateRequest request) {
        return appointments.create(actor(auth), request);
    }

    @GetMapping("/api/appointments/{id}")
    public AppointmentView get(Authentication auth, @PathVariable Long id) {
        return appointments.get(actor(auth), id);
    }

    /** {@code scope}: upcoming (default), past or cancelled. */
    @GetMapping("/api/me/appointments")
    public List<AppointmentView> mine(Authentication auth, @RequestParam(defaultValue = "upcoming") String scope) {
        return appointments.mine(actor(auth), scope(scope));
    }

    @PatchMapping("/api/appointments/{id}/cancel")
    public AppointmentView cancel(
            Authentication auth, @PathVariable Long id, @Valid @RequestBody(required = false) CancelRequest request) {
        return appointments.cancel(actor(auth), id, request == null ? null : request.reason());
    }

    @PatchMapping("/api/appointments/{id}/reschedule")
    public AppointmentView reschedule(
            Authentication auth, @PathVariable Long id, @Valid @RequestBody RescheduleRequest request) {
        return appointments.reschedule(actor(auth), id, request.date(), request.time());
    }

    @PatchMapping("/api/admin/appointments/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public AppointmentView changeStatus(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return appointments.changeStatus(null, id, request.status());
    }

    private static Actor actor(Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        return new Actor(auth.getName(), admin);
    }

    private static Scope scope(String value) {
        try {
            return Scope.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Naməlum scope: " + value);
        }
    }
}
