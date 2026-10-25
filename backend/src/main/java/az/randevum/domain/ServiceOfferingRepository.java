package az.randevum.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    List<ServiceOffering> findByProviderIdOrderByPriceAsc(Long providerId);

    List<ServiceOffering> findByProviderIdAndActiveTrueOrderByPriceAsc(Long providerId);

    Optional<ServiceOffering> findByIdAndProviderId(Long id, Long providerId);

    @Query("select min(s.price) from ServiceOffering s where s.provider.id = :providerId and s.active = true")
    Optional<BigDecimal> findMinActivePrice(Long providerId);
}
