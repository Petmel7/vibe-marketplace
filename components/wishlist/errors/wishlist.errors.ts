export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized')

        this.name = 'UnauthorizedError'
    }
}

export class WishlistApiError extends Error {
    constructor(message: string) {
        super(message)

        this.name = 'WishlistApiError'
    }
}