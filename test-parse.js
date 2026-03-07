const parsePriceStr = (valStr) => {
    const normalized = valStr.replace(/,/g, '.');
    // If it has a dot or a comma, we check how many digits exist AFTER the last dot/comma.
    // In L2, prices like 10.000 mean 10.
    // However, 0.234 means 0.234.
    // 10,000 means 10.
    // By default, parseFloat('10.000') gives 10. parseFloat('0.234') gives 0.234.
    // So actually, parseFloat is already doing exactly what we want directly on the string!
    return parseFloat(normalized);
};

console.log("10.000 ->", parsePriceStr("10.000")); // Expect 10
console.log("0,234 ->", parsePriceStr("0,234")); // Expect 0.234
console.log("5.555 ->", parsePriceStr("5.555")); // Expect 5.555
console.log("23,523 ->", parsePriceStr("23,523")); // Expect 23.523
console.log("234,232 ->", parsePriceStr("234,232")); // Expect 234.232
