package com.garage.inspections;

import com.garage.jobcards.JobCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobCardInspectionRepository extends JpaRepository<JobCardInspection, Long> {
    List<JobCardInspection> findByJobCardId(Long jobCardId);
    Optional<JobCardInspection> findByJobCardAndItemId(JobCard jobCard, Long itemId);
}

