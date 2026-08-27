package com.garage.jobcards;

import com.garage.customers.Customer;
import com.garage.users.User;
import com.garage.vehicles.Vehicle;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "job_cards")
public class JobCard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "job_card_number", nullable = false, unique = true, length = 30)
    private String jobCardNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private JobCardStatus status = JobCardStatus.RECEIVED;

    @Column(name = "odometer_km")
    private Integer odometerKm;

    @Column(name = "expected_delivery_at")
    private OffsetDateTime expectedDeliveryAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "technician_id")
    private User technician;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_advisor_id")
    private User serviceAdvisor;

    @Column(columnDefinition = "text")
    private String complaint;

    @Column(name = "service_types", columnDefinition = "text")
    private String serviceTypes;

    @Column(name = "fuel_level", length = 40)
    private String fuelLevel;

    @Column(name = "vehicle_condition", columnDefinition = "text")
    private String vehicleCondition;

    @Column(columnDefinition = "text")
    private String accessories;

    @Column(name = "photo_urls", columnDefinition = "text")
    private String photoUrls;

    @Column(name = "work_items", columnDefinition = "text")
    private String workItems;

    @Column(name = "parts_items", columnDefinition = "text")
    private String partsItems;

    @Column(name = "labour_items", columnDefinition = "text")
    private String labourItems;

    @Column(name = "estimate_amount", nullable = false)
    private BigDecimal estimateAmount = BigDecimal.ZERO;

    @Column(name = "estimate_notes", columnDefinition = "text")
    private String estimateNotes;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "approval_status", nullable = false, length = 30)
    private String approvalStatus = "PENDING";

    @Column(name = "approval_notes", columnDefinition = "text")
    private String approvalNotes;

    @Column(name = "final_review_notes", columnDefinition = "text")
    private String finalReviewNotes;

    @Column(name = "invoice_number", length = 40)
    private String invoiceNumber;

    @Column(name = "invoice_amount", nullable = false)
    private BigDecimal invoiceAmount = BigDecimal.ZERO;

    @Column(name = "payment_status", nullable = false, length = 30)
    private String paymentStatus = "PENDING";

    @Column(name = "paid_amount", nullable = false)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Column(name = "payment_mode", length = 40)
    private String paymentMode;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "delivery_notes", columnDefinition = "text")
    private String deliveryNotes;

    @Column(name = "follow_up_at")
    private OffsetDateTime followUpAt;

    @Column(name = "follow_up_notes", columnDefinition = "text")
    private String followUpNotes;

    @Column(name = "whatsapp_reminder_at")
    private OffsetDateTime whatsappReminderAt;

    @Column(name = "next_service_at")
    private OffsetDateTime nextServiceAt;

    @Column(name = "next_service_km")
    private Integer nextServiceKm;

    @Column(name = "follow_up_type", length = 40)
    private String followUpType;

    @Column(name = "return_notes", columnDefinition = "text")
    private String returnNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @PrePersist
    void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
