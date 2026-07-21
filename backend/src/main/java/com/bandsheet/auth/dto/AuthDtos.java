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

    // credential 為 Google Identity Services 回傳的 ID token(JWT)。登入與綁定共用。
    public record GoogleLoginRequest(@NotBlank String credential) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 50) String displayName) {}

    // currentPassword 可為 null:Google 登入(尚無本地密碼)的使用者首次設定密碼時免填。
    public record ChangePasswordRequest(
            String currentPassword,
            @NotBlank @Size(min = 8, message = "密碼至少 8 字元") String newPassword) {}

    public record UserDto(UUID id, String email, String displayName) {}

    // 個人設定頁使用:附帶帳號有無本地密碼、是否已綁定 Google。
    public record ProfileDto(UUID id, String email, String displayName,
                             boolean hasPassword, boolean googleLinked) {}
}
