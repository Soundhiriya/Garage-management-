package com.garage.jobcards;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkflowService {
    private final JobCardRepository jobCardRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public WorkflowDtos.WorkflowDetails get(Long id) {
        JobCard jobCard = jobCardRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job Card not found"));
        return toDetails(jobCard);
    }

    @Transactional(readOnly = true)
    public List<WorkflowDtos.WorkflowDetails> list() {
        return jobCardRepository.findTop50ByOrderByCreatedAtDesc().stream().map(this::toDetails).toList();
    }

    @Transactional(readOnly = true)
    public List<WorkflowDtos.WorkflowDetails> vehicleHistory(Long vehicleId) {
        return jobCardRepository.findByVehicleIdOrderByCreatedAtDesc(vehicleId).stream().map(this::toDetails).toList();
    }

    @Transactional
    public WorkflowDtos.WorkflowDetails update(Long id, WorkflowDtos.WorkflowUpdateRequest request) {
        JobCard jobCard = jobCardRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job Card not found"));
        if (request.status() != null) jobCard.setStatus(request.status());
        if (request.workItems() != null) jobCard.setWorkItems(writeJson(request.workItems()));
        if (request.partsItems() != null) jobCard.setPartsItems(writeJson(request.partsItems()));
        if (request.labourItems() != null) jobCard.setLabourItems(writeJson(request.labourItems()));
        if (request.discountAmount() != null) jobCard.setDiscountAmount(request.discountAmount());
        if (request.estimateNotes() != null) jobCard.setEstimateNotes(blankToNull(request.estimateNotes()));
        if (request.approvalStatus() != null) jobCard.setApprovalStatus(request.approvalStatus());
        if (request.approvalNotes() != null) jobCard.setApprovalNotes(blankToNull(request.approvalNotes()));
        if (request.finalReviewNotes() != null) jobCard.setFinalReviewNotes(blankToNull(request.finalReviewNotes()));
        if (request.invoiceNumber() != null) jobCard.setInvoiceNumber(blankToNull(request.invoiceNumber()));
        if (request.paymentStatus() != null) jobCard.setPaymentStatus(request.paymentStatus());
        if (request.paidAmount() != null) jobCard.setPaidAmount(request.paidAmount());
        if (request.paymentMode() != null) jobCard.setPaymentMode(blankToNull(request.paymentMode()));
        if (request.deliveredAt() != null) jobCard.setDeliveredAt(request.deliveredAt());
        if (request.deliveryNotes() != null) jobCard.setDeliveryNotes(blankToNull(request.deliveryNotes()));
        if (request.followUpAt() != null) jobCard.setFollowUpAt(request.followUpAt());
        if (request.followUpNotes() != null) jobCard.setFollowUpNotes(blankToNull(request.followUpNotes()));
        if (request.whatsappReminderAt() != null) jobCard.setWhatsappReminderAt(request.whatsappReminderAt());
        if (request.returnNotes() != null) jobCard.setReturnNotes(blankToNull(request.returnNotes()));
        if (request.nextServiceAt() != null) jobCard.setNextServiceAt(request.nextServiceAt());
        if (request.nextServiceKm() != null) jobCard.setNextServiceKm(request.nextServiceKm());
        if (request.followUpType() != null) jobCard.setFollowUpType(blankToNull(request.followUpType()));

        // Estimate/invoice totals are always derived from parts + labour + discount, never trusted from the client.
        BigDecimal[] totals = computeTotals(parseWorkItems(jobCard.getWorkItems()), parseParts(jobCard.getPartsItems()), parseLabour(jobCard.getLabourItems()), jobCard.getDiscountAmount());
        jobCard.setEstimateAmount(totals[2]);
        if (request.invoiceNumber() != null || jobCard.getInvoiceNumber() != null) {
            jobCard.setInvoiceAmount(totals[2]);
        }

        return toDetails(jobCardRepository.save(jobCard));
    }

    WorkflowDtos.WorkflowDetails toDetails(JobCard jobCard) {
        List<WorkflowDtos.WorkItemDto> workItems = parseWorkItems(jobCard.getWorkItems());
        List<WorkflowDtos.PartItemDto> partsItems = parseParts(jobCard.getPartsItems());
        List<WorkflowDtos.LabourItemDto> labourItems = parseLabour(jobCard.getLabourItems());
        BigDecimal discount = nvl(jobCard.getDiscountAmount());
        BigDecimal[] totals = computeTotals(workItems, partsItems, labourItems, discount);
        BigDecimal invoiceAmount = nvl(jobCard.getInvoiceAmount());
        BigDecimal paidAmount = nvl(jobCard.getPaidAmount());
        BigDecimal balance = invoiceAmount.subtract(paidAmount).max(BigDecimal.ZERO);

        return new WorkflowDtos.WorkflowDetails(
                jobCard.getId(),
                jobCard.getJobCardNumber(),
                jobCard.getStatus(),
                jobCard.getCustomer().getName(),
                jobCard.getCustomer().getPhone(),
                jobCard.getVehicle().getId(),
                jobCard.getVehicle().getRegistrationNumber(),
                jobCard.getVehicle().getChassisNumber(),
                jobCard.getServiceTypes(),
                jobCard.getComplaint(),
                workItems,
                partsItems,
                labourItems,
                totals[0],
                totals[1],
                discount,
                totals[2],
                jobCard.getEstimateNotes(),
                jobCard.getApprovalStatus(),
                jobCard.getApprovalNotes(),
                jobCard.getFinalReviewNotes(),
                jobCard.getInvoiceNumber(),
                invoiceAmount,
                derivePaymentStatus(invoiceAmount, paidAmount, jobCard.getPaymentStatus()),
                paidAmount,
                balance,
                jobCard.getPaymentMode(),
                jobCard.getDeliveredAt(),
                jobCard.getDeliveryNotes(),
                jobCard.getFollowUpAt(),
                jobCard.getFollowUpNotes(),
                jobCard.getWhatsappReminderAt(),
                jobCard.getReturnNotes(),
                jobCard.getNextServiceAt(),
                jobCard.getNextServiceKm(),
                jobCard.getFollowUpType(),
                jobCard.getCreatedAt(),
                jobCard.getUpdatedAt()
        );
    }

    private String derivePaymentStatus(BigDecimal invoiceAmount, BigDecimal paidAmount, String fallback) {
        if (invoiceAmount.compareTo(BigDecimal.ZERO) <= 0) return fallback == null ? "PENDING" : fallback;
        if (paidAmount.compareTo(BigDecimal.ZERO) <= 0) return "PENDING";
        if (paidAmount.compareTo(invoiceAmount) >= 0) return "PAID";
        return "PARTIALLY PAID";
    }

    private BigDecimal[] computeTotals(List<WorkflowDtos.WorkItemDto> workItems, List<WorkflowDtos.PartItemDto> parts, List<WorkflowDtos.LabourItemDto> labour, BigDecimal discount) {
        BigDecimal partsSubtotal = BigDecimal.ZERO;
        BigDecimal partsGst = BigDecimal.ZERO;
        for (WorkflowDtos.PartItemDto part : parts) {
            BigDecimal qty = nvl(part.qty());
            BigDecimal price = nvl(part.price());
            BigDecimal lineTotal = qty.multiply(price);
            BigDecimal gst = lineTotal.multiply(nvl(part.gstPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            partsSubtotal = partsSubtotal.add(lineTotal);
            partsGst = partsGst.add(gst);
        }
        BigDecimal labourSubtotal = BigDecimal.ZERO;
        BigDecimal labourGst = BigDecimal.ZERO;
        for (WorkflowDtos.LabourItemDto item : labour) {
            BigDecimal qty = nvl(item.qty());
            BigDecimal rate = nvl(item.rate());
            BigDecimal lineTotal = qty.multiply(rate);
            BigDecimal gst = lineTotal.multiply(nvl(item.gstPercent())).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            labourSubtotal = labourSubtotal.add(lineTotal);
            labourGst = labourGst.add(gst);
        }
        BigDecimal subtotal = partsSubtotal.add(labourSubtotal).setScale(2, RoundingMode.HALF_UP);
        BigDecimal gstTotal = partsGst.add(labourGst).setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.add(gstTotal).subtract(nvl(discount)).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        return new BigDecimal[]{subtotal, gstTotal, grandTotal};
    }

    private List<WorkflowDtos.WorkItemDto> parseWorkItems(String raw) {
        List<WorkflowDtos.WorkItemDto> parsed = readJson(raw, new TypeReference<>() {});
        if (parsed != null) return parsed;
        return legacyLines(raw).stream().map(line -> new WorkflowDtos.WorkItemDto(line, null, "Pending", null)).toList();
    }

    private List<WorkflowDtos.PartItemDto> parseParts(String raw) {
        List<WorkflowDtos.PartItemDto> parsed = readJson(raw, new TypeReference<>() {});
        if (parsed != null) return parsed;
        return legacyLines(raw).stream().map(line -> new WorkflowDtos.PartItemDto(line, null, BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO, null)).toList();
    }

    private List<WorkflowDtos.LabourItemDto> parseLabour(String raw) {
        List<WorkflowDtos.LabourItemDto> parsed = readJson(raw, new TypeReference<>() {});
        if (parsed != null) return parsed;
        return legacyLines(raw).stream().map(line -> new WorkflowDtos.LabourItemDto(line, BigDecimal.ONE, BigDecimal.ZERO, BigDecimal.ZERO, null)).toList();
    }

    private <T> List<T> readJson(String raw, TypeReference<List<T>> type) {
        if (raw == null || raw.isBlank() || !raw.trim().startsWith("[")) return null;
        try {
            return objectMapper.readValue(raw, type);
        } catch (Exception ex) {
            return null;
        }
    }

    private List<String> legacyLines(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("\\n")).map(String::trim).filter(item -> !item.isBlank()).toList();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not encode workflow items", ex);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
