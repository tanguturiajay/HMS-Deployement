const deepEqual = require("./deepEqual");

// Strips Mongoose internals and converts Dates to ISO strings
const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value)); // NOSONAR: structuredClone keeps Dates as objects and throws on Mongoose subdocuments

// Day-granular form for date comparisons (Date -> ISO -> yyyy-mm-dd; "yyyy-mm-dd..." -> yyyy-mm-dd)
const dayOf = (value) =>
    typeof value === "string" ? value.slice(0, 10) : value;

// Reduces array items to the given keys (drops subdoc _id and other noise)
const pickKeys = (value, keys) =>
    Array.isArray(value)
        ? value.map((item) =>
              keys.reduce((acc, key) => {
                  acc[key] = item?.[key];
                  return acc;
              }, {}),
          )
        : value;

// Returns true when any defined incoming field differs from the current document with optional date and array comparison rules
const hasFieldChanges = (current, incoming, fields, options = {}) => {
    const dateFields = new Set(options.dateFields || []);
    const arrayKeys = options.arrayKeys || {};

    return fields.some((field) => {
        if (incoming[field] === undefined) {
            return false;
        }

        let currentValue = clone(current[field]);
        let incomingValue = clone(incoming[field]);

        if (dateFields.has(field)) {
            currentValue = dayOf(currentValue);
            incomingValue = dayOf(incomingValue);
        }

        if (arrayKeys[field]) {
            currentValue = pickKeys(currentValue, arrayKeys[field]);
            incomingValue = pickKeys(incomingValue, arrayKeys[field]);
        }

        return !deepEqual(currentValue ?? null, incomingValue ?? null);
    });
};

module.exports = hasFieldChanges;
