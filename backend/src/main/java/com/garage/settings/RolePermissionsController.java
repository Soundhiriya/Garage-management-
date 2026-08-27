package com.garage.settings;

import com.garage.common.ApiResponse;
import com.garage.users.UserRole;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class RolePermissionsController {
    @GetMapping("/role-permissions")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ApiResponse<List<RolePermissionRow>> rolePermissions() {
        return ApiResponse.ok("Role permissions", List.of(
                row("Vehicle Entry", "Yes", "Yes", "Yes"),
                row("Customer / Vehicle", "Yes", "Yes", "Yes"),
                row("Vehicle History", "Yes", "Yes", "Assigned / available"),
                row("Job Card", "Yes", "Yes", "Yes"),
                row("Inspection", "Yes", "Yes", "Yes"),
                row("Work / Parts", "Yes", "Yes", "Yes"),
                row("Estimate", "Yes", "Yes", "No"),
                row("Generate / Finalize Bill", "Yes", "Yes", "No"),
                row("Payments", "Yes", "Yes", "No"),
                row("Follow-ups", "Yes", "Yes", "No"),
                row("Reports", "Yes", "Yes", "No"),
                row("Manage Users / Roles", "Yes", "No", "No")
        ));
    }

    private RolePermissionRow row(String feature, String admin, String manager, String technician) {
        return new RolePermissionRow(feature, Map.of(
                UserRole.ADMIN, admin,
                UserRole.MANAGER, manager,
                UserRole.TECHNICIAN, technician
        ));
    }

    public record RolePermissionRow(String feature, Map<UserRole, String> permissions) {}
}

