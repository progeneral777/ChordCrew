package com.bandsheet.auth;

import com.bandsheet.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // OAuth(Google)使用者沒有本地密碼,故可為 null。
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "display_name", nullable = false, length = 50)
    private String displayName;

    // Google 帳號的唯一識別碼(id token 的 sub);非 Google 使用者為 null。
    @Column(name = "google_sub", unique = true, length = 255)
    private String googleSub;

    protected User() {}

    public User(String email, String passwordHash, String displayName) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
    }

    /** 建立以 Google 登入的使用者(無本地密碼)。 */
    public static User googleUser(String email, String displayName, String googleSub) {
        User user = new User();
        user.email = email;
        user.displayName = displayName;
        user.googleSub = googleSub;
        return user;
    }

    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getGoogleSub() { return googleSub; }
    public void setGoogleSub(String googleSub) { this.googleSub = googleSub; }
}
