package az.randevum;

import org.springframework.boot.SpringApplication;

/** Runs the API locally against a throwaway PostgreSQL container: ./gradlew bootTestRun */
public class TestRandevumApplication {

    public static void main(String[] args) {
        SpringApplication.from(RandevumApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
