function calculateGoldPrice(weightInBaht, pricePerBaht) {
  if (typeof weightInBaht !== 'number' || typeof pricePerBaht !== 'number') {
    throw new Error('Weight and price must be numbers');
  }
  if (weightInBaht < 0 || pricePerBaht < 0) {
    throw new Error('Weight and price must be positive');
  }
  return weightInBaht * pricePerBaht;
}

function calculateGoldPriceWithFee(weightInBaht, pricePerBaht, feePercent = 1) {
  const basePrice = calculateGoldPrice(weightInBaht, pricePerBaht);
  const fee = basePrice * (feePercent / 100);
  return basePrice + fee;
}

module.exports = { calculateGoldPrice, calculateGoldPriceWithFee };
