package com.garage.jobcards;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public class WorkflowDtos {
    public record WorkItemDto(String description, String technician, String status, String notes) {}

    public record PartItemDto(String name, String partNumber, BigDecimal qty, BigDecimal price, BigDecimal gstPercent, String notes) {}

    public record LabourItemDto(String description, BigDecimal qty, BigDecimal rate, BigDecimal gstPercent, String notes) {}

    public record WorkflowUpdateRequest(
            JobCardStatus status,
            List<WorkItemDto> workItems,
            List<PartItemDto> partsItems,
            List<LabourItemDto> labourItems,
            BigDecimal discountAmount,
            String estimateNotes,
            String approvalStatus,
            String approvalNotes,
            String finalReviewNotes,
            String invoiceNumber,
            BigDecimal invoiceAmount,
            String paymentStatus,
            BigDecimal paidAmount,
            String paymentMode,
            OffsetDateTime deliveredAt,
            String deliveryNotes,
            OffsetDateTime followUpAt,
            String followUpNotes,
            OffsetDateTime whatsappReminderAt,
            String returnNotes,
            OffsetDateTime nextServiceAt,
            Integer nextServiceKm,
            String followUpType
    ) {}

    public record WorkflowDetails(
            Long id,
            String jobCardNumber,
            JobCardStatus status,
            String customerName,
            String customerPhone,
            Long vehicleId,
            String registrationNumber,
            String chassisNumber,
            String serviceTypes,
            String complaint,
            List<WorkItemDto> workItems,
            List<PartItemDto> partsItems,
            List<LabourItemDto> labourItems,
            BigDecimal subtotal,
            BigDecimal gstTotal,
            BigDecimal discountAmount,
            BigDecimal estimateAmount,
            String estimateNotes,
            String approvalStatus,
            String approvalNotes,
            String finalReviewNotes,
            String invoiceNumber,
            BigDecimal invoiceAmount,
            String paymentStatus,
            BigDecimal paidAmount,
            BigDecimal balanceAmount,
            String paymentMode,
            OffsetDateTime deliveredAt,
            String deliveryNotes,
            OffsetDateTime followUpAt,
            String followUpNotes,
            OffsetDateTime whatsappReminderAt,
            String returnNotes,
            OffsetDateTime nextServiceAt,
            Integer nextServiceKm,
            String followUpType,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {}
}
