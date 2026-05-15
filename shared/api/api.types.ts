export interface ApiSuccessResponse<T> {
    success: true
    data: T
}

export interface ApiErrorResponse {
    success: false
    error: {
        message: string
        code?: string
    }
}

export type ApiResponse<T> =
    | ApiSuccessResponse<T>
    | ApiErrorResponse