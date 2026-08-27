package com.garage.settings;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "garage_settings")
public class GarageSettings {
    @Id
    private Long id = 1L;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(columnDefinition = "text")
    private String address;

    @Column(length = 30)
    private String gstin;

    @Column(length = 20)
    private String phone;

    @Column(length = 180)
    private String email;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onSave() {
        updatedAt = OffsetDateTime.now();
    }
}
