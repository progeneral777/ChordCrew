package com.bandsheet.auth;

import java.util.UUID;

/** Authenticated principal extracted from a verified JWT. */
public record AuthUser(UUID id, String email, String displayName) {}
