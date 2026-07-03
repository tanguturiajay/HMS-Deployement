// Order independent deep equality for plain JSON values used to detect real update changes
function deepEqual(a, b) {
    if (a === b) {
        return true;
    }

    // Treat null/undefined as equal to each other
    if (a === null || a === undefined || b === null || b === undefined) {
        return (a ?? null) === (b ?? null);
    }

    if (typeof a !== "object" || typeof b !== "object") {
        return false;
    }

    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    if (aIsArray || bIsArray) {
        if (!aIsArray || !bIsArray || a.length !== b.length) {
            return false;
        }
        return a.every((value, index) => deepEqual(value, b[index]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    return keysA.every((key) => deepEqual(a[key], b[key]));
}

module.exports = deepEqual;
