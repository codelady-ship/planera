package az.randevum.reminder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import az.randevum.common.BusinessRuleException;
import az.randevum.config.JwtConfig;
import az.randevum.config.SecurityConfig;
import az.randevum.reminder.NotificationSettingsDtos.SettingsView;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(NotificationSettingsController.class)
@Import({SecurityConfig.class, JwtConfig.class})
class NotificationSettingsControllerTest {

    @Autowired MockMvcTester mvc;

    @MockitoBean NotificationSettingsService settings;

    @Test
    void settingsRequireAuthentication() {
        assertThat(mvc.get().uri("/api/me/notification-settings")).hasStatus(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void readsAndWritesTheOffsets() {
        given(settings.get("musteri@randevum.az")).willReturn(new SettingsView(List.of(60, 15, 0)));
        assertThat(mvc.get().uri("/api/me/notification-settings"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.reminderOffsets")
                .isEqualTo(List.of(60, 15, 0));

        given(settings.update("musteri@randevum.az", List.of(1440, 0))).willReturn(new SettingsView(List.of(1440, 0)));
        assertThat(mvc.put().uri("/api/me/notification-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reminderOffsets\":[1440,0]}"))
                .hasStatusOk()
                .bodyJson()
                .extractingPath("$.reminderOffsets[0]")
                .isEqualTo(1440);
    }

    @Test
    @WithMockUser(username = "musteri@randevum.az")
    void anOffsetOutsideTheAllowedSetIsRejected() {
        given(settings.update("musteri@randevum.az", List.of(7)))
                .willThrow(new BusinessRuleException("Xatırlatma vaxtı yanlışdır"));

        assertThat(mvc.put().uri("/api/me/notification-settings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reminderOffsets\":[7]}"))
                .hasStatus(HttpStatus.UNPROCESSABLE_CONTENT);
        assertThat(mvc.put().uri("/api/me/notification-settings").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .hasStatus(HttpStatus.BAD_REQUEST);
    }
}
