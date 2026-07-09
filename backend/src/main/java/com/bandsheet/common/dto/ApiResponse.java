package com.bandsheet.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record ApiResponse<T>(T data, ErrorBody error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(null, new ErrorBody(code, message, null));
    }

    public static <T> ApiResponse<T> error(String code, String message, Map<String, String> fieldErrors) {
        return new ApiResponse<>(null, new ErrorBody(code, message, fieldErrors));
    }

    public record ErrorBody(String code, String message,
                            @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fieldErrors) {}
}
