package az.planera.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Properties;
import java.util.Set;
import org.junit.jupiter.api.Test;

/** API texts in three languages (#94): complete bundles, header matching and the exception wording. */
class MessagesTest {

    private static Set<String> keys(String file) throws IOException {
        Properties properties = new Properties();
        try (var reader = new InputStreamReader(
                MessagesTest.class.getResourceAsStream("/" + file), StandardCharsets.UTF_8)) {
            properties.load(reader);
        }
        return properties.stringPropertyNames();
    }

    @Test
    void everyLanguageHasEveryKey() throws IOException {
        Set<String> az = keys("messages.properties");
        assertThat(az).isNotEmpty();
        assertThat(keys("messages_en.properties")).containsExactlyInAnyOrderElementsOf(az);
        assertThat(keys("messages_ru.properties")).containsExactlyInAnyOrderElementsOf(az);
    }

    @Test
    void acceptLanguagePicksASupportedLanguageOrAzerbaijani() {
        assertThat(Messages.locale("en-US,en;q=0.9")).isEqualTo(Locale.ENGLISH);
        assertThat(Messages.locale("ru-RU")).isEqualTo(Locale.forLanguageTag("ru"));
        assertThat(Messages.locale("tr-TR, de;q=0.5")).isEqualTo(Messages.DEFAULT);
        assertThat(Messages.locale(null)).isEqualTo(Messages.DEFAULT);
        assertThat(Messages.locale("not a header ;;")).isEqualTo(Messages.DEFAULT);
    }

    @Test
    void exceptionsReadAzerbaijanByDefaultAndTheCallerLanguageOnRequest() {
        NotFoundException e = new NotFoundException(Messages.key("appointment.notFound", 1234L));
        assertThat(e.getMessage()).isEqualTo("Randevu tapılmadı: 1234");
        assertThat(e.localizedMessage(Locale.ENGLISH)).isEqualTo("Appointment not found: 1234");
        assertThat(e.localizedMessage(Locale.forLanguageTag("ru"))).isEqualTo("Запись не найдена: 1234");
        // A language without a bundle falls back to Azerbaijani, never to the server's locale.
        assertThat(e.localizedMessage(Locale.GERMAN)).isEqualTo("Randevu tapılmadı: 1234");
        assertThat(new BusinessRuleException("düz mətn").localizedMessage(Locale.ENGLISH)).isEqualTo("düz mətn");
    }
}
