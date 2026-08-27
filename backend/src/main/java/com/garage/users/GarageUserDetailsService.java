package com.garage.users;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class GarageUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        String normalized = identifier == null ? "" : identifier.trim();
        User user = userRepository.findByEmailIgnoreCase(normalized)
                .or(() -> userRepository.findByMobile(normalized))
                .orElseThrow(() -> new UsernameNotFoundException("Invalid mobile/email or password"));
        return new GarageUserDetails(user);
    }
}

