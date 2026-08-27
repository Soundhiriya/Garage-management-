package com.garage.settings;

import com.garage.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings/garage")
@RequiredArgsConstructor
public class GarageSettingsController {
    private final GarageSettingsRepository repository;

    public record GarageSettingsRequest(String name, String address, String gstin, String phone, String email) {}

    public record GarageSettingsResponse(String name, String address, String gstin, String phone, String email) {}

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ApiResponse<GarageSettingsResponse> get() {
        return ApiResponse.ok("Garage settings", toResponse(loadOrCreate()));
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    @Transactional
    public ApiResponse<GarageSettingsResponse> update(@RequestBody GarageSettingsRequest request) {
        GarageSettings settings = loadOrCreate();
        if (request.name() != null && !request.name().isBlank()) settings.setName(request.name().trim());
        settings.setAddress(blankToNull(request.address()));
        settings.setGstin(blankToNull(request.gstin()));
        settings.setPhone(blankToNull(request.phone()));
        settings.setEmail(blankToNull(request.email()));
        return ApiResponse.ok("Garage settings saved", toResponse(repository.save(settings)));
    }

    private GarageSettings loadOrCreate() {
        return repository.findById(1L).orElseGet(() -> {
            GarageSettings settings = new GarageSettings();
            settings.setName("Garage Management");
            return repository.save(settings);
        });
    }

    private GarageSettingsResponse toResponse(GarageSettings settings) {
        return new GarageSettingsResponse(settings.getName(), settings.getAddress(), settings.getGstin(), settings.getPhone(), settings.getEmail());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
