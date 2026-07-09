package com.bandsheet.band;

public enum Role {
    OWNER, EDITOR, VIEWER;

    public boolean atLeast(Role required) {
        return rank() >= required.rank();
    }

    private int rank() {
        return switch (this) {
            case OWNER -> 2;
            case EDITOR -> 1;
            case VIEWER -> 0;
        };
    }
}
