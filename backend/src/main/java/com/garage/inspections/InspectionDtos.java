package com.garage.inspections;

import jakarta.validation.Valid;
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
            InspectionCondition condition,
            String notes,
            String photoUrl
    ) {}

    public record SaveInspectionRequest(@NotNull List<@Valid InspectionSaveItem> items) {}
}
