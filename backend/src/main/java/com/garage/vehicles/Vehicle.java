package com.garage.vehicles;

import com.garage.customers.Customer;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "vehicles")
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "registration_number", length = 30)
    private String registrationNumber;

    @Column(name = "chassis_number", nullable = false, unique = true, length = 80)
    private String chassisNumber;

    @Column(length = 80)
    private String make;

    @Column(length = 80)
    private String model;

    @Column(length = 80)
    private String variant;

    private Integer year;

    @Column(length = 40)
    private String fuel;

    @Column(length = 40)
    private String transmission;

    @Column(name = "engine_number", length = 80)
    private String engineNumber;

    @Column(name = "current_km")
    private Integer currentKm;

    @Column(length = 60)
    private String colour;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

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

