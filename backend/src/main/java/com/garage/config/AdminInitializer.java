package com.garage.config;

import com.garage.users.User;
import com.garage.users.UserRepository;
import com.garage.users.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${garage.admin.email}")
    private String adminEmail;

    @Value("${garage.admin.mobile}")
    private String adminMobile;

    @Value("${garage.admin.password}")
    private String adminPassword;

    @Value("${garage.manager.email}")
    private String managerEmail;

    @Value("${garage.manager.mobile}")
    private String managerMobile;

    @Value("${garage.manager.password}")
    private String managerPassword;

    @Value("${garage.technician.email}")
    private String technicianEmail;

    @Value("${garage.technician.mobile}")
    private String technicianMobile;

    @Value("${garage.technician.password}")
    private String technicianPassword;

    @Override
    public void run(String... args) {
        createUser("Garage Admin", adminEmail, adminMobile, adminPassword, UserRole.ADMIN);
        createUser("Garage Manager", managerEmail, managerMobile, managerPassword, UserRole.MANAGER);
        createUser("Garage Technician", technicianEmail, technicianMobile, technicianPassword, UserRole.TECHNICIAN);
    }

    private void createUser(String name, String email, String mobile, String password, UserRole role) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }
        if (!StringUtils.hasText(password)) {
            return;
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email.toLowerCase());
        user.setMobile(mobile);
        user.setRole(role);
        user.setActive(true);
        user.setPasswordHash(passwordEncoder.encode(password));
        userRepository.save(user);
    }
}
