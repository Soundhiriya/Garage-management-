package com.garage.auth;

import com.garage.common.ApiResponse;
import com.garage.customers.CustomerRepository;
import com.garage.jobcards.JobCard;
import com.garage.jobcards.JobCardRepository;
import com.garage.jobcards.JobCardStatus;
import com.garage.vehicles.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {
    private final JobCardRepository jobCardRepository;
    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ApiResponse<Map<String, Object>> adminManagerDashboard() {
        OffsetDateTime startOfToday = LocalDate.now(ZoneId.systemDefault())
                .atStartOfDay(ZoneId.systemDefault())
                .toOffsetDateTime();

        List<JobCardStatus> activeStatuses = List.of(
                JobCardStatus.RECEIVED,
                JobCardStatus.INSPECTION,
                JobCardStatus.ESTIMATE,
                JobCardStatus.APPROVED,
                JobCardStatus.WORK_IN_PROGRESS,
                JobCardStatus.QUALITY_CHECK
        );

        List<JobCard> allJobCards = jobCardRepository.findAll();

        BigDecimal revenue = allJobCards.stream()
                .map(JobCard::getPaidAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal pendingPayments = allJobCards.stream()
                .filter(jobCard -> jobCard.getInvoiceAmount() != null && jobCard.getInvoiceAmount().compareTo(BigDecimal.ZERO) > 0)
                .map(jobCard -> jobCard.getInvoiceAmount().subtract(nvl(jobCard.getPaidAmount())))
                .filter(balance -> balance.compareTo(BigDecimal.ZERO) > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        OffsetDateTime now = OffsetDateTime.now();
        long followups = allJobCards.stream()
                .filter(jobCard -> jobCard.getFollowUpAt() != null && !jobCard.getFollowUpAt().isAfter(now))
                .count();

        return ApiResponse.ok("Dashboard summary", Map.ofEntries(
                Map.entry("todaysVehicles", jobCardRepository.countByCreatedAtGreaterThanEqual(startOfToday)),
                Map.entry("activeJobs", jobCardRepository.countByStatusIn(activeStatuses)),
                Map.entry("waitingApproval", jobCardRepository.countByStatus(JobCardStatus.WAITING_APPROVAL)),
                Map.entry("readyForDelivery", jobCardRepository.countByStatus(JobCardStatus.READY_FOR_DELIVERY)),
                Map.entry("revenue", revenue),
                Map.entry("pendingPayments", pendingPayments),
                Map.entry("followups", followups),
                Map.entry("totalCustomers", customerRepository.count()),
                Map.entry("totalVehicles", vehicleRepository.count()),
                Map.entry("totalJobCards", jobCardRepository.count())
        ));
    }

    private BigDecimal nvl(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    @GetMapping("/technician")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ApiResponse<Map<String, Object>> technicianDashboard() {
        return ApiResponse.ok("Technician dashboard summary", Map.of(
                "assignedJobs", 0,
                "pendingInspections", 0,
                "activeWork", 0,
                "completedJobs", 0
        ));
    }
}
