package com.garage.inspections;

import com.garage.jobcards.JobCard;
import com.garage.jobcards.JobCardRepository;
import com.garage.jobcards.JobCardStatus;
import com.garage.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InspectionService {
    private final JobCardRepository jobCardRepository;
    private final InspectionItemRepository inspectionItemRepository;
    private final JobCardInspectionRepository jobCardInspectionRepository;

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public java.util.List<InspectionDtos.InspectionRow> getInspection(Long jobCardId) {
        Map<Long, JobCardInspection> existing = jobCardInspectionRepository.findByJobCardId(jobCardId).stream()
                .collect(Collectors.toMap(row -> row.getItem().getId(), Function.identity()));
        return inspectionItemRepository.findByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(item -> {
                    JobCardInspection saved = existing.get(item.getId());
                    return new InspectionDtos.InspectionRow(
                            item.getId(),
                            item.getName(),
                            saved == null ? null : saved.getConditionStatus(),
                            saved == null ? null : saved.getNotes(),
                            saved == null ? null : saved.getPhotoUrl()
                    );
                })
                .toList();
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public java.util.List<InspectionDtos.InspectionRow> saveInspection(Long jobCardId, InspectionDtos.SaveInspectionRequest request, User actor) {
        JobCard jobCard = jobCardRepository.findById(jobCardId).orElseThrow(() -> new IllegalArgumentException("Job Card not found"));
        for (InspectionDtos.InspectionSaveItem input : request.items()) {
            InspectionItem item = inspectionItemRepository.findById(input.itemId()).orElseThrow(() -> new IllegalArgumentException("Inspection item not found"));
            JobCardInspection inspection = jobCardInspectionRepository.findByJobCardAndItemId(jobCard, item.getId()).orElseGet(JobCardInspection::new);
            if (inspection.getId() == null) {
                inspection.setJobCard(jobCard);
                inspection.setItem(item);
                inspection.setCreatedBy(actor);
            }
            inspection.setConditionStatus(input.condition());
            inspection.setNotes(blankToNull(input.notes()));
            inspection.setPhotoUrl(blankToNull(input.photoUrl()));
            inspection.setUpdatedBy(actor);
            jobCardInspectionRepository.save(inspection);
        }
        if (jobCard.getStatus() == JobCardStatus.RECEIVED) {
            jobCard.setStatus(JobCardStatus.INSPECTION);
            jobCard.setUpdatedBy(actor);
            jobCardRepository.save(jobCard);
        }
        return getInspection(jobCardId);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

