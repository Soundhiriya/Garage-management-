package com.garage.inspections;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class InspectionDtos {
    public record InspectionRow(
            Long itemId,
            String itemName,
            InspectionCondition condition,
            String notes,
            String photoUrl
    ) {}

    public record InspectionSaveItem(
            @NotNull Long itemId,
            @NotNull InspectionCondition condition,
            String notes,
            String photoUrl
    ) {}

    public record SaveInspectionRequest(@NotEmpty List<@Valid InspectionSaveItem> items) {}
}

