package com.garage.jobcards;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.List;

public interface JobCardRepository extends JpaRepository<JobCard, Long> {
    @Query("select coalesce(max(j.id), 0) from JobCard j")
    long maxId();
    List<JobCard> findTop50ByOrderByCreatedAtDesc();
    List<JobCard> findByVehicleIdOrderByCreatedAtDesc(Long vehicleId);
    long countByCreatedAtGreaterThanEqual(OffsetDateTime createdAt);
    long countByStatusIn(List<JobCardStatus> statuses);
    long countByStatus(JobCardStatus status);
}
