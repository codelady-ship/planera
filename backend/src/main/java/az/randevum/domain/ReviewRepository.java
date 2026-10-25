package az.randevum.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    @EntityGraph(attributePaths = "customer")
    Page<Review> findByProviderIdOrderByCreatedAtDesc(Long providerId, Pageable pageable);

    boolean existsByAppointmentId(Long appointmentId);
}
