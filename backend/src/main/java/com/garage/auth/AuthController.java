package com.garage.auth;

import com.garage.common.ApiResponse;
import com.garage.users.GarageUserDetails;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<AuthDtos.LoginResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request, HttpServletResponse response) {
        AuthDtos.LoginResult login = authService.login(request);
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie(login.refreshToken(), Duration.ofDays(14)).toString());
        return ApiResponse.ok("Login successful", login.response());
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(@CookieValue(name = "garage_refresh", required = false) String refreshToken) {
        return ApiResponse.ok("Token refreshed", Map.of("accessToken", authService.refresh(refreshToken)));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO).toString());
        return ApiResponse.ok("Logged out", null);
    }

    @GetMapping("/me")
    public ApiResponse<AuthDtos.AuthUser> me(@AuthenticationPrincipal GarageUserDetails principal) {
        return ApiResponse.ok("Current user", authService.currentUser(principal.user()));
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.identifier());
        return ApiResponse.ok("If an account exists, password reset instructions will be sent.", null);
    }

    private ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from("garage_refresh", value)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
