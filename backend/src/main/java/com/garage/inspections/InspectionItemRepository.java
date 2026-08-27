package com.garage.inspections;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InspectionItemRepository extends JpaRepository<InspectionItem, Long> {
    List<InspectionItem> findByActiveTrueOrderBySortOrderAscNameAsc();
}

