package com.bandsheet.collab;

import com.bandsheet.auth.AuthUser;

import java.security.Principal;

/** WebSocket 連線的已驗證使用者(JWT 握手成功後設定)。 */
public record StompPrincipal(AuthUser user) implements Principal {
    @Override
    public String getName() {
        return user.id().toString();
    }
}
