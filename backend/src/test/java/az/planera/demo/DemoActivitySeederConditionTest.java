package az.planera.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;

/** The demo job exists only where planera.demo.activity=true (the demo profile, #144). */
class DemoActivitySeederConditionTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(Clock.class, Clock::systemUTC)
            .withUserConfiguration(DemoActivitySeeder.class);

    @Test
    void absentWithoutTheProperty() {
        runner.run(context -> assertThat(context).doesNotHaveBean(DemoActivitySeeder.class));
    }

    @Test
    void absentWhenTurnedOff() {
        runner.withPropertyValues("planera.demo.activity=false")
                .run(context -> assertThat(context).doesNotHaveBean(DemoActivitySeeder.class));
    }

    @Test
    void presentOnTheDemo() {
        runner.withPropertyValues("planera.demo.activity=true")
                .run(context -> assertThat(context).hasSingleBean(DemoActivitySeeder.class));
    }
}
