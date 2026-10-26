package az.planera.personal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import az.planera.config.JwtConfig;
import az.planera.config.SecurityConfig;
import az.planera.domain.PersonalReminder.Source;
import az.planera.domain.PersonalReminder.Status;
import az.planera.personal.PersonalReminderDtos.AgendaItem;
import az.planera.personal.PersonalReminderDtos.ReminderView;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(PersonalReminderController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class PersonalReminderControllerTest {

    static final ReminderView VIEW = new ReminderView(
            5L, "Həkimə getmək", null, LocalDate.of(2026, 10, 27), "15:00",
            Instant.parse("2026-10-27T11:00:00Z"), List.of(60, 0), Source.MANUAL, Status.ACTIVE);

    @Autowired MockMvcTester mvc;

    @MockitoBean PersonalReminderService notes;

    @Test
    void everythingRequiresAuthentication() {
        assertThat(mvc.get().uri("/api/me/reminders")).hasStatus(HttpStatus.UNAUTHORIZED);
        assertThat(mvc.get().uri("/api/me/agenda")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void createsWithDateAndTimeInBaku() {
        given(notes.create(eq("musteri@planera.az"), argThat(r -> r.title().equals("Həkimə getmək")
                        && r.date().equals(LocalDate.of(2026, 10, 27)) && r.time().toString().equals("15:00")
                        && r.reminderOffsets().equals(List.of(60, 0)) && r.source() == Source.VOICE)))
                .willReturn(VIEW);

        assertThat(mvc.post().uri("/api/me/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Həkimə getmək\",\"date\":\"2026-10-27\",\"time\":\"15:00\","
                                + "\"reminderOffsets\":[60,0],\"source\":\"VOICE\"}"))
                .hasStatus(HttpStatus.CREATED)
                .bodyJson()
                .extractingPath("$.time")
                .isEqualTo("15:00");
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void aBlankTitleOrMissingDateIsA400() {
        assertThat(mvc.post().uri("/api/me/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \",\"time\":\"15:00\"}"))
                .hasStatus(HttpStatus.BAD_REQUEST)
                .bodyJson()
                .extractingPath("$.errors")
                .asMap()
                .containsKeys("title", "date");
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void updatesAndDeletesOwnNotes() {
        given(notes.update(eq("musteri@planera.az"), eq(5L), argThat(r -> r.status() == Status.DONE))).willReturn(VIEW);
        assertThat(mvc.patch().uri("/api/me/reminders/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .hasStatusOk();

        assertThat(mvc.delete().uri("/api/me/reminders/5")).hasStatus(HttpStatus.NO_CONTENT);
        verify(notes).delete("musteri@planera.az", 5L);
    }

    @Test
    @WithMockUser(username = "yad@planera.az")
    void someoneElsesNoteIsA403() {
        given(notes.get("yad@planera.az", 5L)).willThrow(new AccessDeniedException("Bu qeyd sizə aid deyil"));

        assertThat(mvc.get().uri("/api/me/reminders/5")).hasStatus(HttpStatus.FORBIDDEN);
    }

    @Test
    @WithMockUser(username = "musteri@planera.az")
    void agendaTakesADateRange() {
        given(notes.agenda("musteri@planera.az", LocalDate.of(2026, 10, 26), LocalDate.of(2026, 10, 31)))
                .willReturn(List.of(new AgendaItem(
                        AgendaItem.NOTE, 5L, VIEW.startsAt(), VIEW.date(), "15:00", "Həkimə getmək", null, "ACTIVE")));

        assertThat(mvc.get().uri("/api/me/agenda").param("from", "2026-10-26").param("to", "2026-10-31"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$[0].type")
                .isEqualTo("NOTE");
    }
}
