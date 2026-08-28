package com.garage.jobcards;

import com.garage.customers.Customer;
import com.garage.customers.CustomerRepository;
import com.garage.users.User;
import com.garage.vehicles.Vehicle;
import com.garage.vehicles.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RegisterService {
    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;
    private final JobCardRepository jobCardRepository;

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public RegisterDtos.RegisterResponse register(RegisterDtos.RegisterRequest request, User actor) {
        String phone = request.phoneNumber().trim();
        Customer customer = customerRepository.findByPhone(phone).orElseGet(Customer::new);
        customer.setName(request.customerName().trim());
        customer.setPhone(phone);
        customer.setAddress(request.address().trim());
        customer = customerRepository.save(customer);

        String registrationNumber = blankToNull(request.registrationNumber()) == null ? null : request.registrationNumber().trim().toUpperCase();
        if (registrationNumber != null && vehicleRepository.findByRegistrationNumberIgnoreCase(registrationNumber).isPresent()) {
            throw new IllegalArgumentException("Vehicle number already exists. Search and open the existing vehicle instead.");
        }

        String chassis = request.chassisNumber().trim().toUpperCase();
        Vehicle vehicle = vehicleRepository.findByChassisNumberIgnoreCase(chassis).orElseGet(Vehicle::new);
        vehicle.setCustomer(customer);
        vehicle.setChassisNumber(chassis);
        vehicle.setRegistrationNumber(registrationNumber);
        vehicle.setCurrentKm(request.currentKm());
        vehicle = vehicleRepository.save(vehicle);

        JobCard jobCard = new JobCard();
        jobCard.setCustomer(customer);
        jobCard.setVehicle(vehicle);
        jobCard.setStatus(JobCardStatus.RECEIVED);
        jobCard.setCreatedBy(actor);
        jobCard.setUpdatedBy(actor);
        jobCard.setJobCardNumber(nextJobCardNumber());
        jobCard.setOdometerKm(request.currentKm());
        jobCard.setExpectedDeliveryAt(request.expectedDeliveryAt());
        jobCard.setComplaint(blankToNull(request.complaint()));
        jobCard.setServiceTypes(joinServiceTypes(request.serviceTypes()));
        jobCard.setFuelLevel(blankToNull(request.fuelLevel()));
        jobCard.setVehicleCondition(blankToNull(request.vehicleCondition()));
        jobCard = jobCardRepository.save(jobCard);

        return new RegisterDtos.RegisterResponse(customer.getId(), vehicle.getId(), jobCard.getId(), jobCard.getJobCardNumber());
    }

    @Transactional(readOnly = true)
    public RegisterDtos.JobCardDetails getJobCard(Long id) {
        JobCard jobCard = jobCardRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job Card not found"));
        Customer customer = jobCard.getCustomer();
        Vehicle vehicle = jobCard.getVehicle();
        return new RegisterDtos.JobCardDetails(
                jobCard.getId(),
                jobCard.getJobCardNumber(),
                jobCard.getStatus(),
                jobCard.getCreatedAt(),
                jobCard.getOdometerKm(),
                jobCard.getExpectedDeliveryAt(),
                jobCard.getComplaint(),
                jobCard.getServiceTypes(),
                jobCard.getFuelLevel(),
                jobCard.getVehicleCondition(),
                jobCard.getAccessories(),
                jobCard.getPhotoUrls(),
                new RegisterDtos.CustomerDetails(customer.getId(), customer.getName(), customer.getPhone(), customer.getAddress()),
                new RegisterDtos.VehicleDetails(vehicle.getId(), vehicle.getChassisNumber(), vehicle.getRegistrationNumber(), vehicle.getCurrentKm())
        );
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public List<RegisterDtos.CustomerListItem> listCustomers() {
        return customerRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(customer -> new RegisterDtos.CustomerListItem(
                        customer.getId(),
                        customer.getName(),
                        customer.getPhone(),
                        customer.getAddress(),
                        customer.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public List<RegisterDtos.VehicleListItem> listVehicles() {
        return vehicleRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(vehicle -> new RegisterDtos.VehicleListItem(
                        vehicle.getId(),
                        vehicle.getChassisNumber(),
                        vehicle.getRegistrationNumber(),
                        vehicle.getCurrentKm(),
                        vehicle.getCustomer().getName(),
                        vehicle.getCustomer().getPhone(),
                        vehicle.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','TECHNICIAN')")
    public List<RegisterDtos.JobCardListItem> listJobCards() {
        return jobCardRepository.findTop50ByOrderByCreatedAtDesc().stream()
                .map(jobCard -> new RegisterDtos.JobCardListItem(
                        jobCard.getId(),
                        jobCard.getJobCardNumber(),
                        jobCard.getStatus(),
                        jobCard.getCustomer().getName(),
                        jobCard.getCustomer().getPhone(),
                        jobCard.getVehicle().getChassisNumber(),
                        jobCard.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public RegisterDtos.JobCardDetails updateJobCard(Long id, RegisterDtos.JobCardUpdateRequest request, User actor) {
        JobCard jobCard = jobCardRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Job Card not found"));
        jobCard.setOdometerKm(request.odometerKm());
        jobCard.setExpectedDeliveryAt(request.expectedDeliveryAt());
        jobCard.setComplaint(blankToNull(request.complaint()));
        jobCard.setServiceTypes(joinServiceTypes(request.serviceTypes()));
        jobCard.setFuelLevel(blankToNull(request.fuelLevel()));
        jobCard.setVehicleCondition(blankToNull(request.vehicleCondition()));
        jobCard.setAccessories(blankToNull(request.accessories()));
        jobCard.setPhotoUrls(blankToNull(request.photoUrls()));
        jobCard.setUpdatedBy(actor);
        return getJobCard(jobCardRepository.save(jobCard).getId());
    }

    @Transactional(readOnly = true)
    public Optional<RegisterDtos.VehicleSearchResult> searchVehicle(String query) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }
        String normalized = query.trim().toUpperCase();
        Optional<Vehicle> vehicle = vehicleRepository.findByRegistrationNumberIgnoreCase(normalized)
                .or(() -> vehicleRepository.findByChassisNumberIgnoreCase(normalized));

        return vehicle.map(found -> {
            Customer customer = found.getCustomer();
            JobCard lastJobCard = jobCardRepository.findByVehicleIdOrderByCreatedAtDesc(found.getId()).stream()
                    .max(Comparator.comparing(JobCard::getCreatedAt))
                    .orElse(null);
            return new RegisterDtos.VehicleSearchResult(
                    found.getId(),
                    customer.getId(),
                    customer.getName(),
                    customer.getPhone(),
                    customer.getAddress(),
                    found.getChassisNumber(),
                    found.getRegistrationNumber(),
                    found.getCurrentKm(),
                    lastJobCard == null ? null : lastJobCard.getCreatedAt(),
                    lastJobCard == null ? found.getCurrentKm() : lastJobCard.getOdometerKm(),
                    lastJobCard == null ? null : lastJobCard.getId(),
                    lastJobCard == null ? null : lastJobCard.getJobCardNumber()
            );
        });
    }

    private String joinServiceTypes(List<String> serviceTypes) {
        if (serviceTypes == null || serviceTypes.isEmpty()) {
            return null;
        }
        return String.join(",", serviceTypes);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String nextJobCardNumber() {
        long next = jobCardRepository.maxId() + 1;
        return "JC-" + Year.now().getValue() + "-" + String.format("%06d", next);
    }
}
