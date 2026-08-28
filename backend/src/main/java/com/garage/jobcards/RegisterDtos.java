package com.garage.jobcards;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Pattern;

import java.time.OffsetDateTime;
import java.util.List;

public class RegisterDtos {
    public record RegisterRequest(
            @NotBlank String chassisNumber,
            @NotBlank String registrationNumber,
            @NotBlank String customerName,
            @NotBlank @Pattern(regexp = "^\\d{10}$", message = "Phone number must be 10 digits") String phoneNumber,
            @NotBlank String address,
            Integer currentKm,
            List<String> serviceTypes,
            String complaint,
            String fuelLevel,
            String vehicleCondition,
            OffsetDateTime expectedDeliveryAt
    ) {}

    public record RegisterResponse(
            Long customerId,
            Long vehicleId,
            Long jobCardId,
            String jobCardNumber
    ) {}

    public record JobCardDetails(
            Long id,
            String jobCardNumber,
            JobCardStatus status,
            OffsetDateTime createdAt,
            Integer odometerKm,
            OffsetDateTime expectedDeliveryAt,
            String complaint,
            String serviceTypes,
            String fuelLevel,
            String vehicleCondition,
            String accessories,
            String photoUrls,
            CustomerDetails customer,
            VehicleDetails vehicle
    ) {}

    public record JobCardUpdateRequest(
            @PositiveOrZero Integer odometerKm,
            OffsetDateTime expectedDeliveryAt,
            String complaint,
            List<String> serviceTypes,
            String fuelLevel,
            String vehicleCondition,
            String accessories,
            String photoUrls
    ) {}

    public record CustomerDetails(Long id, String name, String phone, String address) {}

    public record VehicleDetails(Long id, String chassisNumber, String registrationNumber, Integer currentKm) {}

    public record CustomerListItem(Long id, String name, String phone, String address, OffsetDateTime createdAt) {}

    public record VehicleListItem(
            Long id,
            String chassisNumber,
            String registrationNumber,
            Integer currentKm,
            String customerName,
            String customerPhone,
            OffsetDateTime createdAt
    ) {}

    public record VehicleSearchResult(
            Long vehicleId,
            Long customerId,
            String customerName,
            String customerPhone,
            String customerAddress,
            String chassisNumber,
            String registrationNumber,
            Integer currentKm,
            OffsetDateTime lastServiceDate,
            Integer lastKm,
            Long lastJobCardId,
            String lastJobCardNumber
    ) {}

    public record JobCardListItem(
            Long id,
            String jobCardNumber,
            JobCardStatus status,
            String customerName,
            String customerPhone,
            String chassisNumber,
            OffsetDateTime createdAt
    ) {}
}
