package com.garage.common;

public record ApiResponse<T>(boolean success, String message, String code, T data) {
    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, null, data);
    }

    public static <T> ApiResponse<T> fail(String message, String code) {
        return new ApiResponse<>(false, message, code, null);
    }
}

