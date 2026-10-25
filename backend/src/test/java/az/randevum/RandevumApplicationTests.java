package az.randevum;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;

/** Full context against a real PostgreSQL. Skipped on machines without Docker; CI runs it. */
@Testcontainers(disabledWithoutDocker = true)
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class RandevumApplicationTests {

    @Test
    void contextLoads() {}
}
