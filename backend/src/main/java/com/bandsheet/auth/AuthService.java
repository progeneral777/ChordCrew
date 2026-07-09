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
    private final int refreshTokenExpiryDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${app.jwt.refresh-token-expiry-days}") int refreshTokenExpiryDays) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "email 或密碼錯誤", HttpStatus.UNAUTHORIZED));

        String rawToken = generateRawToken();
        refreshTokenRepository.save(new RefreshToken(
                user.getId(), sha256(rawToken),
                Instant.now().plus(Duration.ofDays(refreshTokenExpiryDays))));

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getDisplayName());
        return new LoginResult(accessToken, rawToken, toDto(user));
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
