package com.bandsheet.auth;

import com.bandsheet.auth.dto.AuthDtos.LoginRequest;
import com.bandsheet.auth.dto.AuthDtos.RegisterRequest;
import com.bandsheet.auth.dto.AuthDtos.UserDto;
import com.bandsheet.common.dto.ApiResponse;
import com.bandsheet.common.exception.AppException;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String REFRESH_COOKIE = "refreshToken";

    private final AuthService authService;
    private final int refreshTokenExpiryDays;

    public AuthController(AuthService authService,
                          @Value("${app.jwt.refresh-token-expiry-days}") int refreshTokenExpiryDays) {
        this.authService = authService;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    @PostMapping("/register")
    public ApiResponse<Map<String, UserDto>> register(@Valid @RequestBody RegisterRequest req) {
        return ApiResponse.ok(Map.of("user", authService.register(req)));
    }

    @PostMapping("/login")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody LoginRequest req,
                                                  HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(req);
        response.addHeader(HttpHeaders.SET_COOKIE,
                refreshCookie(result.refreshToken(), Duration.ofDays(refreshTokenExpiryDays)).toString());
        return ApiResponse.ok(Map.of("accessToken", result.accessToken(), "user", result.user()));
    }

    @PostMapping("/refresh")
    public ApiResponse<Map<String, String>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String token) {
        if (token == null) {
            throw new AppException("UNAUTHORIZED", "缺少 refresh token", HttpStatus.UNAUTHORIZED);
        }
        return ApiResponse.ok(Map.of("accessToken", authService.refresh(token)));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@CookieValue(name = REFRESH_COOKIE, required = false) String token,
                       HttpServletResponse response) {
        if (token != null) {
            authService.logout(token);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie("", Duration.ZERO).toString());
    }

    @GetMapping("/me")
    public ApiResponse<Map<String, UserDto>> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok(Map.of("user", new UserDto(user.id(), user.email(), user.displayName())));
    }

    private ResponseCookie refreshCookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .path("/api/auth")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }
}
