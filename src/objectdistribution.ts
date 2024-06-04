
export const ObjectDistributionTypes = ["transport", "gentle", "thrill", "water", "rollercoaster", "foodstall", "drinkstall", "otherstall"] as const;
export type ObjectDistributionType = typeof ObjectDistributionTypes[number];

