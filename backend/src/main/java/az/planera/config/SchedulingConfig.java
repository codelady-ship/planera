package az.planera.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Background jobs ({@code @Scheduled}): the reminder sender (#56). Test slices do not load this. */
@Configuration
@EnableScheduling
public class SchedulingConfig {}
