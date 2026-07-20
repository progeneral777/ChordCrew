package com.bandsheet.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public final class AuthDtos {

    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, message = "密碼至少 8 字元") String password,
            @NotBlank @Size(max = 50) String displayName) {}

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {}

    // credential 為 Google Identity Services 回傳的 ID token(JWT)。
    public record GoogleLoginRequest(@NotBlank String credential) {}

    public record UserDto(UUID id, String email, String displayName) {}
}
