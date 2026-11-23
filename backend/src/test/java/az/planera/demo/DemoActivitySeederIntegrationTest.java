package az.planera.demo;

import static org.assertj.core.api.Assertions.assertThat;

import az.planera.TestcontainersConfiguration;
import az.planera.stats.StatsDtos.StatsView;
import az.planera.stats.StatsService;
import java.time.Clock;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * The public demo (profile "demo") starts with a living dashboard (#144): the
 * demo appointments around today are in the database, the admin statistics
 * are not zero, and a second run adds nothing. Skipped without Docker; CI runs it.
 */
@Testcontainers(disabledWithoutDocker = true)
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@ActiveProfiles("demo")
class DemoActivitySeederIntegrationTest {

    @Autowired DemoActivitySeeder seeder;
    @Autowired StatsService stats;
    @Autowired JdbcTemplate jdbc;
    @Autowired Clock clock;

    private long demoRows() {
        return jdbc.queryForObject("select count(*) from appointments where code like 'DM-%'", Long.class);
    }

    @Test
    void startupFillsTheDashboardAndARerunAddsNothing() {
        long planned = DemoActivityPlan.around(LocalDate.now(clock)).size();
        assertThat(demoRows()).isPositive().isLessThanOrEqualTo(planned);

        StatsView view = stats.stats(null);
        assertThat(view.weekCount()).isPositive();
        assertThat(view.weekRevenue()).isPositive();
        assertThat(view.popularServices()).isNotEmpty();

        long before = demoRows();
        assertThat(seeder.refresh()).isZero();
        assertThat(demoRows()).isEqualTo(before);
    }

    @Test
    void pastDemoAppointmentsAreSettledAndPlanNoReminders() {
        Long open = jdbc.queryForObject("""
                select count(*) from appointments
                 where code like 'DM-%' and status in ('PENDING', 'CONFIRMED')
                   and starts_at < date_trunc('day', now() at time zone 'Asia/Baku') at time zone 'Asia/Baku'
                """, Long.class);
        assertThat(open).isZero();
        Long reminders = jdbc.queryForObject("""
                select count(*) from reminders r join appointments a on a.id = r.appointment_id
                 where a.code like 'DM-%'
                """, Long.class);
        assertThat(reminders).isZero();
        // The extra demo customers cannot sign in: they have no password.
        Long withPassword = jdbc.queryForObject(
                "select count(*) from users where email like '%@demo.planera.az' and password_hash is not null", Long.class);
        assertThat(withPassword).isZero();
    }
}
