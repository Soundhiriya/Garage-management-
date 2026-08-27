package com.garage.jobcards;

import com.garage.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class WorkflowController {
    private final WorkflowService workflowService;

    @GetMapping("/api/workflow/job-cards")
    public ApiResponse<List<WorkflowDtos.WorkflowDetails>> list() {
        return ApiResponse.ok("Workflow job cards", workflowService.list());
    }

    @GetMapping("/api/workflow/job-cards/{id}")
    public ApiResponse<WorkflowDtos.WorkflowDetails> get(@PathVariable Long id) {
        return ApiResponse.ok("Workflow job card", workflowService.get(id));
    }

    @PutMapping("/api/job-cards/{id}/workflow")
    public ApiResponse<WorkflowDtos.WorkflowDetails> update(@PathVariable Long id, @RequestBody WorkflowDtos.WorkflowUpdateRequest request) {
        return ApiResponse.ok("Workflow updated", workflowService.update(id, request));
    }

    @GetMapping("/api/vehicles/{vehicleId}/history")
    public ApiResponse<List<WorkflowDtos.WorkflowDetails>> vehicleHistory(@PathVariable Long vehicleId) {
        return ApiResponse.ok("Vehicle history", workflowService.vehicleHistory(vehicleId));
    }
}
