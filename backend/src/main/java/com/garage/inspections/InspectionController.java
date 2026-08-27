package com.garage.inspections;

import com.garage.common.ApiResponse;
import com.garage.users.GarageUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/job-cards/{jobCardId}/inspection")
@RequiredArgsConstructor
public class InspectionController {
    private final InspectionService inspectionService;

    @GetMapping
    public ApiResponse<List<InspectionDtos.InspectionRow>> getInspection(@PathVariable Long jobCardId) {
        return ApiResponse.ok("Inspection items", inspectionService.getInspection(jobCardId));
    }

    @PostMapping
    public ApiResponse<List<InspectionDtos.InspectionRow>> saveInspection(
            @PathVariable Long jobCardId,
            @Valid @RequestBody InspectionDtos.SaveInspectionRequest request,
            @AuthenticationPrincipal GarageUserDetails principal
    ) {
        return ApiResponse.ok("Inspection saved", inspectionService.saveInspection(jobCardId, request, principal.user()));
    }
}
