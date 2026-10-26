package az.randevum.personal;

import az.randevum.personal.PersonalReminderDtos.AgendaItem;
import az.randevum.personal.PersonalReminderDtos.CreateRequest;
import az.randevum.personal.PersonalReminderDtos.ReminderView;
import az.randevum.personal.PersonalReminderDtos.UpdateRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in user's personal notes and the merged agenda (#59). */
@RestController
public class PersonalReminderController {

    private final PersonalReminderService notes;

    public PersonalReminderController(PersonalReminderService notes) {
        this.notes = notes;
    }

    @GetMapping("/api/me/reminders")
    public List<ReminderView> list(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return notes.list(auth.getName(), from, to);
    }

    @PostMapping("/api/me/reminders")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderView create(Authentication auth, @Valid @RequestBody CreateRequest request) {
        return notes.create(auth.getName(), request);
    }

    @GetMapping("/api/me/reminders/{id}")
    public ReminderView get(Authentication auth, @PathVariable Long id) {
        return notes.get(auth.getName(), id);
    }

    @PatchMapping("/api/me/reminders/{id}")
    public ReminderView update(Authentication auth, @PathVariable Long id, @Valid @RequestBody UpdateRequest request) {
        return notes.update(auth.getName(), id, request);
    }

    @DeleteMapping("/api/me/reminders/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Authentication auth, @PathVariable Long id) {
        notes.delete(auth.getName(), id);
    }

    /** Appointments and notes together, by time. */
    @GetMapping("/api/me/agenda")
    public List<AgendaItem> agenda(
            Authentication auth,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return notes.agenda(auth.getName(), from, to);
    }
}
