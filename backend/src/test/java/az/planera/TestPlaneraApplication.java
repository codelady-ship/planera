package az.planera;

import org.springframework.boot.SpringApplication;

/** Runs the API locally against a throwaway PostgreSQL container: ./gradlew bootTestRun */
public class TestPlaneraApplication {

    public static void main(String[] args) {
        SpringApplication.from(PlaneraApplication::main).with(TestcontainersConfiguration.class).run(args);
    }
}
