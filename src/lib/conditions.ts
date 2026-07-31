export const PRODUCT_CONDITIONS = [
  "Brand New",
  "Used – Like New",
  "Used – Good",
  "Used – Fair",
];

export const isUsedCondition = (condition: string) => condition.startsWith("Used");
