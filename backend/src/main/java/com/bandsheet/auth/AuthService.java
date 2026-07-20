package com.bandsheet.auth;

import com.bandsheet.auth.dto.AuthDtos.LoginRequest;
import com.bandsheet.auth.dto.AuthDtos.RegisterRequest;
import com.bandsheet.auth.dto.AuthDtos.UserDto;
import com.bandsheet.common.exception.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final int refreshTokenExpiryDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       GoogleTokenVerifier googleTokenVerifier,
                       @Value("${app.jwt.refresh-token-expiry-days}") int refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleTokenVerifier = googleTokenVerifier;
        this.refreshTokenExpiryDays = refreshTokenExpiryDays;
    }

    public record LoginResult(String accessToken, String refreshToken, UserDto user) {}

    @Transactional
    public UserDto register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw AppException.conflict("EMAIL_TAKEN", "此 email 已被註冊");
        }
        User user = userRepository.save(
                new User(req.email(), passwordEncoder.encode(req.password()), req.displayName()));
        return toDto(user);
    }

    @Transactional
    public LoginResult login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .filter(u -> u.getPasswordHash() != null
                        && passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "email 或密碼錯誤", HttpStatus.UNAUTHORIZED));
        return issueTokens(user);
    }

    /**
     * 以 Google ID token 登入:驗證 credential,再依 google_sub → email 順序找帳號,
     * 都沒有就自動建立一個以 Google 綁定的帳號。
     */
    @Transactional
    public LoginResult loginWithGoogle(String credential) {
        GoogleTokenVerifier.GooglePayload payload = googleTokenVerifier.verify(credential);
        if (!payload.emailVerified()) {
            throw new AppException("GOOGLE_EMAIL_UNVERIFIED", "Google 帳號的 email 尚未驗證", HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findByGoogleSub(payload.sub())
                .orElseGet(() -> userRepository.findByEmail(payload.email())
                        .map(existing -> {
                            // 既有(本地或先前)帳號:綁定 google_sub 供日後直接以 Google 登入。
                            existing.setGoogleSub(payload.sub());
                            return existing;
                        })
                        .orElseGet(() -> userRepository.save(
                                User.googleUser(payload.email(), safeDisplayName(payload), payload.sub()))));

        return issueTokens(user);
    }

    private LoginResult issueTokens(User user) {
        String rawToken = generateRawToken();
        refreshTokenRepository.save(new RefreshToken(
                user.getId(), sha256(rawToken),
                Instant.now().plus(Duration.ofDays(refreshTokenExpiryDays))));

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getDisplayName());
        return new LoginResult(accessToken, rawToken, toDto(user));
    }

    // Google 未提供 name 時,以 email 的帳號部分作為顯示名稱,並限制 50 字元(對齊 display_name 長度)。
    private static String safeDisplayName(GoogleTokenVerifier.GooglePayload payload) {
        String name = payload.name();
        if (name == null || name.isBlank()) {
            name = payload.email().split("@")[0];
        }
        return name.length() > 50 ? name.substring(0, 50) : name;
    }

    @Transactional(readOnly = true)
    public String refresh(String rawToken) {
        RefreshToken stored = refreshTokenRepository.findByTokenHash(sha256(rawToken))
                .filter(t -> t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "refresh token 無效或已過期", HttpStatus.UNAUTHORIZED));
        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "使用者不存在", HttpStatus.UNAUTHORIZED));
        return jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getDisplayName());
    }

    @Transactional
    public void logout(String rawToken) {
        refreshTokenRepository.deleteByTokenHash(sha256(rawToken));
    }

    private UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getEmail(), user.getDisplayName());
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
