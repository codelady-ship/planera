package az.planera.demo;

import az.planera.config.TimeConfig;
import az.planera.demo.DemoActivityPlan.Planned;
import java.time.OffsetDateTime;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Keeps the public demo alive (#144): the demo admin dashboard reads this
 * week and the last 30 days, and a catalog seeded once would sooner or later
 * show only zeros. At startup and every night it adds the
 * {@link DemoActivityPlan} rows that are still missing and moves the demo
 * appointments of past days to their outcome.
 *
 * <p>Only on when {@code planera.demo.activity=true} (application-demo.yml,
 * the public demo on Render). Dev and the tests keep an empty calendar.
 *
 * <ul>
 *   <li>Idempotent: every row has a fixed {@code DM-} code and is inserted
 *       with {@code on conflict do nothing}, which also skips a row whose
 *       time a real booking already holds (appointments_no_overlap).</li>
 *   <li>Only demo rows are ever updated ({@code DM-} codes); real
 *       appointments are never touched.</li>
 *   <li>Rows are written directly, so no reminders or e-mails are planned.</li>
 *   <li>Without the demo catalog (no such provider) nothing is inserted.</li>
 * </ul>
 */
@Component
@ConditionalOnProperty(name = "planera.demo.activity", havingValue = "true")
public class DemoActivitySeeder implements ApplicationRunner {

    /** Demo customers that are not in the SQL seed; they have no password, so nobody can sign in as them. */
    static final Map<String, String> EXTRA_CUSTOMERS = Map.of(
            "nermin@demo.planera.az", "Nərmin Hüseynova",
            "orxan@demo.planera.az", "Orxan Səfərov",
            "gunel@demo.planera.az", "Günel Məmmədova",
            "resad@demo.planera.az", "Rəşad Nəsirov",
            "sevinc@demo.planera.az", "Sevinc Kərimova");

    private static final String INSERT = """
            insert into appointments (code, provider_id, customer_id, service_id, starts_at, ends_at, status, price,
                                      cancelled_at, cancel_reason)
            select ?::varchar, p.id, c.id, s.id, ?::timestamptz,
                   ?::timestamptz + make_interval(mins => s.duration_minutes), ?::varchar, s.price,
                   case when ?::varchar = 'CANCELLED' then ?::timestamptz - interval '1 day' end, null
              from provider_profiles p
              join service_offerings s on s.provider_id = p.id and s.name = ?::varchar
              join users c on c.email = ?::varchar
             where p.slug = ?::varchar
            on conflict do nothing
            """;

    private static final String SETTLE = """
            update appointments
               set status = ?::varchar,
                   cancelled_at = case when ?::varchar = 'CANCELLED' then starts_at - interval '1 day' end
             where code = ?::varchar and status in ('PENDING', 'CONFIRMED')
            """;

    private static final Logger log = LoggerFactory.getLogger(DemoActivitySeeder.class);

    private final JdbcTemplate jdbc;
    private final Clock clock;

    public DemoActivitySeeder(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        safely();
    }

    /** Shortly after midnight in Baku, when "today" and "this week" move on. */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Baku")
    public void nightly() {
        safely();
    }

    private void safely() {
        try {
            int added = refresh();
            if (added > 0) log.info("Demo activity: added {} demo appointment(s)", added);
        } catch (RuntimeException e) {
            // The demo data is a nicety: the API keeps running without it.
            log.error("Demo activity could not be refreshed", e);
        }
    }

    /** Adds the missing demo appointments; returns how many were inserted. */
    public int refresh() {
        LocalDate today = LocalDate.now(clock);
        EXTRA_CUSTOMERS.forEach((email, name) -> jdbc.update(
                "insert into users (email, full_name, role) values (?, ?, 'CUSTOMER') on conflict (email) do nothing",
                email, name));

        List<Planned> plan = DemoActivityPlan.around(today);
        int added = 0;
        for (Planned a : plan) {
            OffsetDateTime start = a.date().atTime(a.start()).atZone(TimeConfig.BAKU).toOffsetDateTime();
            String status = a.status().name();
            added += jdbc.update(INSERT, a.code(), start, start, status, status, start,
                    a.serviceName(), a.customerEmail(), a.providerSlug());
        }
        for (Planned a : plan) {
            if (a.date().isBefore(today)) {
                String outcome = a.outcome().name();
                jdbc.update(SETTLE, outcome, outcome, a.code());
            }
        }
        return added;
    }
}
