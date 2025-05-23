export function getLimitAndSkipHelper(page: number, pageSize: number): { limit: number; skip: number } {
    return {
        skip: (page - 1) * pageSize,
        limit: pageSize,
    };
}
