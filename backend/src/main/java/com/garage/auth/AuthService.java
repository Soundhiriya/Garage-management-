package com.garage.auth;

import com.garage.config.JwtService;
import com.garage.users.GarageUserDetails;
import com.garage.users.User;
import com.garage.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public AuthDtos.LoginResult login(AuthDtos.LoginRequest request) {
        var auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.identifier(), request.password())
        );
        User user = ((GarageUserDetails) auth.getPrincipal()).user();
        if (!user.isActive()) {
            throw new DisabledException("inactive");
        }
        if (user.getRole() != request.role()) {
            throw new BadCredentialsException("role mismatch");
        }
        return new AuthDtos.LoginResult(
                new AuthDtos.LoginResponse(jwtService.createAccessToken(user), toAuthUser(user)),
                jwtService.createRefreshToken(user)
        );
    }

    public String refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("missing refresh token");
        }
        var claims = jwtService.parse(refreshToken);
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new BadCredentialsException("invalid refresh token");
        }
        User user = userRepository.findByEmailIgnoreCase(claims.getSubject())
                .orElseThrow(() -> new BadCredentialsException("invalid refresh token"));
        if (!user.isActive()) {
            throw new DisabledException("inactive");
        }
        return jwtService.createAccessToken(user);
    }

    public AuthDtos.AuthUser currentUser(User user) {
        return toAuthUser(user);
    }

    public void requestPasswordReset(String identifier) {
        // V1 foundation intentionally returns a generic success message. Email/SMS delivery plugs in here.
        userRepository.findByEmailIgnoreCase(identifier).or(() -> userRepository.findByMobile(identifier)).ifPresent(user -> {});
    }

    private AuthDtos.AuthUser toAuthUser(User user) {
        return new AuthDtos.AuthUser(user.getId(), user.getName(), user.getEmail(), user.getMobile(), user.getRole());
    }
}
