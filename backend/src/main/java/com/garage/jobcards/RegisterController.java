package com.garage.jobcards;

import com.garage.common.ApiResponse;
import com.garage.users.GarageUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class RegisterController {
    private final RegisterService registerService;

    @PostMapping("/api/register")
    public ApiResponse<RegisterDtos.RegisterResponse> register(
            @Valid @RequestBody RegisterDtos.RegisterRequest request,
            @AuthenticationPrincipal GarageUserDetails principal
    ) {
        return ApiResponse.ok("Registered and Job Card created", registerService.register(request, principal.user()));
    }

    @GetMapping("/api/job-cards/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ApiResponse<RegisterDtos.JobCardDetails> getJobCard(@PathVariable Long id) {
        return ApiResponse.ok("Job Card details", registerService.getJobCard(id));
    }

    @GetMapping("/api/vehicle-entry/search")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ApiResponse<RegisterDtos.VehicleSearchResult> searchVehicle(@RequestParam String query) {
        return registerService.searchVehicle(query)
                .map(result -> ApiResponse.ok("Vehicle found", result))
                .orElseGet(() -> ApiResponse.ok("Vehicle not found", null));
    }

    @GetMapping("/api/customers")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ApiResponse<List<RegisterDtos.CustomerListItem>> listCustomers() {
        return ApiResponse.ok("Customers", registerService.listCustomers());
    }

    @GetMapping("/api/vehicles")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ApiResponse<List<RegisterDtos.VehicleListItem>> listVehicles() {
        return ApiResponse.ok("Vehicles", registerService.listVehicles());
    }

    @GetMapping("/api/job-cards")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public ApiResponse<List<RegisterDtos.JobCardListItem>> listJobCards() {
        return ApiResponse.ok("Job Cards", registerService.listJobCards());
    }

    @PutMapping("/api/job-cards/{id}")
    public ApiResponse<RegisterDtos.JobCardDetails> updateJobCard(
            @PathVariable Long id,
            @Valid @RequestBody RegisterDtos.JobCardUpdateRequest request,
            @AuthenticationPrincipal GarageUserDetails principal
    ) {
        return ApiResponse.ok("Job Card updated", registerService.updateJobCard(id, request, principal.user()));
    }
}
