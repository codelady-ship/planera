package az.planera.demo;

import az.planera.domain.AppointmentStatus;
import az.planera.stats.StatsCalculator;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

/**
 * Demo appointments around a given day (#144), as a pure function so the
 * rules are unit-tested without a database.
 *
 * <p>The public demo (portfolio "look as the demo admin") must never show an
 * empty dashboard, so {@link DemoActivitySeeder} keeps this plan in the demo
 * database: it covers exactly the days the panel statistics read
 * ({@link StatsCalculator#from} .. {@link StatsCalculator#to}).
 *
 * <ul>
 *   <li>Each day is decided by its own date only (a fixed random seed), so the
 *       same day always yields the same rows and codes, whatever "today" is.</li>
 *   <li>Within a day every appointment has a different provider, so the plan
 *       never collides with itself.</li>
 *   <li>Times follow the seeded working hours: Monday-Friday 09:00-13:00 and
 *       14:00-18:00, Saturday 10:00-15:00, Sunday off.</li>
 *   <li>Days before today carry their outcome (completed, cancelled, no-show);
 *       today and later are confirmed or pending, unless cancelled ahead.</li>
 * </ul>
 */
public final class DemoActivityPlan {

    /** Code prefix of every demo appointment; real codes start with "RV-". */
    public static final String CODE_PREFIX = "DM-";

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");

    /** Provider slug and its services, as in db/seed/R__demo_data.sql. */
    record Offer(String providerSlug, String serviceName, int minutes) {}

    static final List<List<Offer>> PROVIDERS = List.of(
            List.of(new Offer("elvin-barber", "Saç kəsimi", 30),
                    new Offer("elvin-barber", "Saqqal dizaynı", 20),
                    new Offer("elvin-barber", "Saç + saqqal", 50)),
            List.of(new Offer("leyla-beauty", "Manikür", 45),
                    new Offer("leyla-beauty", "Üz baxımı", 60)),
            List.of(new Offer("dr-leyla-hesenova", "Müayinə", 30),
                    new Offer("dr-leyla-hesenova", "Diş təmizlənməsi", 60),
                    new Offer("dr-leyla-hesenova", "Diş ağardılması", 90)),
            List.of(new Offer("dr-tural-quliyev", "Ümumi müayinə", 30)),
            List.of(new Offer("kamran-consulting", "Konsultasiya", 45),
                    new Offer("kamran-consulting", "Ətraflı strategiya sessiyası", 90)),
            List.of(new Offer("sebine-huquq", "Hüquqi məsləhət", 45)),
            List.of(new Offer("nigar-english", "Fərdi dərs", 60),
                    new Offer("nigar-english", "IELTS hazırlığı", 90)),
            List.of(new Offer("rauf-fitness", "Fərdi məşq", 60)));

    /** Demo customers (created by the seeder when missing); the demo admin sees them anonymized. */
    static final List<String> CUSTOMERS = List.of(
            "musteri@planera.az",
            "nermin@demo.planera.az",
            "orxan@demo.planera.az",
            "gunel@demo.planera.az",
            "resad@demo.planera.az",
            "sevinc@demo.planera.az");

    /** One planned appointment; {@code outcome} is what it becomes once its day has passed. */
    public record Planned(
            String code,
            LocalDate date,
            LocalTime start,
            String providerSlug,
            String serviceName,
            String customerEmail,
            AppointmentStatus status,
            AppointmentStatus outcome) {}

    private DemoActivityPlan() {}

    /** Every planned appointment for the days the statistics of {@code today} read. */
    public static List<Planned> around(LocalDate today) {
        List<Planned> plan = new ArrayList<>();
        LocalDate last = StatsCalculator.to(today);
        for (LocalDate d = StatsCalculator.from(today); !d.isAfter(last); d = d.plusDays(1)) {
            plan.addAll(day(d, today));
        }
        return plan;
    }

    /** The appointments of one day; empty on Sundays. */
    static List<Planned> day(LocalDate date, LocalDate today) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SUNDAY) return List.of();
        Random random = new Random(date.toEpochDay() * 31 + 7);
        boolean saturday = dow == DayOfWeek.SATURDAY;
        int count = saturday ? 2 + random.nextInt(2) : 4 + random.nextInt(4); // Sat 2-3, weekdays 4-7

        List<Integer> providers = new ArrayList<>(List.of(0, 1, 2, 3, 4, 5, 6, 7));
        Collections.shuffle(providers, random);

        List<Planned> day = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            List<Offer> offers = PROVIDERS.get(providers.get(i));
            Offer offer = offers.get(random.nextInt(offers.size()));
            LocalTime start = start(saturday, offer.minutes(), random);
            String customer = CUSTOMERS.get(random.nextInt(CUSTOMERS.size()));

            int roll = random.nextInt(100);
            AppointmentStatus outcome = roll < 10
                    ? AppointmentStatus.CANCELLED
                    : roll < 15 ? AppointmentStatus.NO_SHOW : AppointmentStatus.COMPLETED;
            boolean pending = random.nextInt(100) < 20;
            AppointmentStatus status;
            if (date.isBefore(today)) {
                status = outcome;
            } else if (outcome == AppointmentStatus.CANCELLED) {
                status = AppointmentStatus.CANCELLED;
            } else {
                status = pending ? AppointmentStatus.PENDING : AppointmentStatus.CONFIRMED;
            }

            String code = CODE_PREFIX + date.format(CODE_DATE) + "-" + (i + 1);
            day.add(new Planned(code, date, start, offer.providerSlug(), offer.serviceName(), customer, status, outcome));
        }
        return day;
    }

    /** A half-hour start that ends inside one working block. */
    private static LocalTime start(boolean saturday, int minutes, Random random) {
        List<LocalTime> starts = new ArrayList<>();
        int[][] blocks = saturday ? new int[][] {{10 * 60, 15 * 60}} : new int[][] {{9 * 60, 13 * 60}, {14 * 60, 18 * 60}};
        for (int[] block : blocks) {
            for (int m = block[0]; m + minutes <= block[1]; m += 30) {
                starts.add(LocalTime.of(m / 60, m % 60));
            }
        }
        return starts.get(random.nextInt(starts.size()));
    }
}
