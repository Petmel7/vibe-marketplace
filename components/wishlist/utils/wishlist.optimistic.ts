type Params = {
    productId: string
    alreadyExists: boolean
    add(productId: string): void
    remove(productId: string): void
}

export function optimisticToggle({
    productId,
    alreadyExists,
    add,
    remove,
}: Params) {
    if (alreadyExists) {
        remove(productId)
    } else {
        add(productId)
    }
}

export function rollbackToggle({
    productId,
    alreadyExists,
    add,
    remove,
}: Params) {
    if (alreadyExists) {
        add(productId)
    } else {
        remove(productId)
    }
}