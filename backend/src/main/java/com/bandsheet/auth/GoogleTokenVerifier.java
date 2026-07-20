package com.bandsheet.auth;

import com.bandsheet.common.exception.AppException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

/**
 * 驗證前端傳來的 Google ID token(credential)。
 * GoogleIdTokenVerifier 會檢查簽章(對 Google 公鑰)、發行者、有效期,以及 audience 是否為我方 client id。
 */
@Component
public class GoogleTokenVerifier {

    /** 驗證後從 ID token 取出的使用者資訊。 */
    public record GooglePayload(String sub, String email, boolean emailVerified, String name) {}

    private final GoogleIdTokenVerifier verifier;
    private final boolean enabled;

    public GoogleTokenVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.enabled = StringUtils.hasText(clientId);
        this.verifier = enabled
                ? new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(Collections.singletonList(clientId))
                        .build()
                : null;
    }

    public GooglePayload verify(String credential) {
        if (!enabled) {
            throw new AppException("GOOGLE_LOGIN_DISABLED",
                    "尚未設定 Google 登入(缺少 GOOGLE_CLIENT_ID)", HttpStatus.SERVICE_UNAVAILABLE);
        }
        GoogleIdToken idToken;
        try {
            idToken = verifier.verify(credential);
        } catch (GeneralSecurityException | IOException e) {
            throw new AppException("GOOGLE_TOKEN_INVALID", "Google 憑證驗證失敗", HttpStatus.UNAUTHORIZED);
        }
        if (idToken == null) {
            throw new AppException("GOOGLE_TOKEN_INVALID", "Google 憑證無效或已過期", HttpStatus.UNAUTHORIZED);
        }
        GoogleIdToken.Payload p = idToken.getPayload();
        return new GooglePayload(
                p.getSubject(),
                p.getEmail(),
                Boolean.TRUE.equals(p.getEmailVerified()),
                (String) p.get("name"));
    }
}
