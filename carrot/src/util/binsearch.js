/**
 * Binary search on integers in [left, right) for the first value for which predicate returns true.
 */
export default function binarySearch(left, right, predicate) {
    if (left > right) {
        throw new Error(`left ${left} must be <= right ${right}`);
    }
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (predicate(mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    return left;
}
