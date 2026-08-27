package com.garage.auth;

import com.garage.users.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class AuthDtos {
    public record LoginRequest(@NotBlank String identifier, @NotBlank String password, @NotNull UserRole role) {}
    public record ForgotPasswordRequest(@NotBlank String identifier) {}
    public record AuthUser(Long id, String name, String email, String mobile, UserRole role) {}
    public record LoginResponse(String accessToken, AuthUser user) {}
    public record LoginResult(LoginResponse response, String refreshToken) {}
}
