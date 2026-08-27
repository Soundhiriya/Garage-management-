package com.garage.vehicles;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByChassisNumberIgnoreCase(String chassisNumber);
    Optional<Vehicle> findByRegistrationNumberIgnoreCase(String registrationNumber);
    List<Vehicle> findTop50ByOrderByCreatedAtDesc();
}
