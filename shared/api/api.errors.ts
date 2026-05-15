export class ApiError extends Error {
    status: number

    code?: string

    constructor(
        message: string,
        status: number,
        code?: string,
    ) {
        super(message)

        this.name = 'ApiError'

        this.status = status
        this.code = code
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(message, 401)
    }
}