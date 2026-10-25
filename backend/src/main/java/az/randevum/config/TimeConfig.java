package az.randevum.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** All booking times are Baku local time; services take this clock so tests can fix it. */
@Configuration
public class TimeConfig {

    public static final ZoneId BAKU = ZoneId.of("Asia/Baku");

    @Bean
    Clock clock() {
        return Clock.system(BAKU);
    }
}
