package az.randevu;

import org.springframework.boot.SpringApplication;

/** Runs the API locally against a throwaway PostgreSQL container: ./gradlew bootTestRun */
public class TestRandevuApplication {

    public static void main(String[] args) {
        SpringApplication.from(RandevuApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
