export type Product = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  ingredients: string[];
  warnings: string[];
  storage: string;
  description: string;
};

export type QaResult = {
  sku: string;
  productName: string;
  status: "PASS" | "WARNING" | "FAIL";
  score: number;
  errors: string[];
  warnings: string[];
  passed: string[];
};

export function validateProductQa(product: Product): QaResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const passed: string[] = [];

  if (!product.sku?.trim()) {
    errors.push("Missing SKU.");
  } else {
    passed.push("SKU is present.");
  }

  if (!product.name?.trim()) {
    errors.push("Missing product name.");
  } else {
    passed.push("Product name is present.");
  }

  if (!product.brand?.trim()) {
    warnings.push("Brand is missing.");
  } else {
    passed.push("Brand is present.");
  }

  if (!product.category?.trim()) {
    warnings.push("Category is missing.");
  } else {
    passed.push("Category is present.");
  }

  if (!product.description?.trim()) {
    warnings.push("Marketing description is missing.");
  } else if (product.description.length < 30) {
    warnings.push("Marketing description is very short.");
  } else {
    passed.push("Marketing description is sufficient.");
  }

  if (!product.storage?.trim()) {
    errors.push("Storage instructions are missing.");
  } else {
    passed.push("Storage instructions are present.");
  }

  if (!product.ingredients || product.ingredients.length === 0) {
    warnings.push("Ingredients are missing.");
  } else {
    passed.push("Ingredients are present.");
  }

  const ingredientText = product.ingredients.join(" ").toLowerCase();
  const warningText = product.warnings.join(" ").toLowerCase();

  const allergenRules = [
    { keyword: "peanut", warning: "peanut" },
    { keyword: "milk", warning: "milk" },
    { keyword: "gluten", warning: "gluten" },
    { keyword: "wheat", warning: "gluten" },
    { keyword: "soy", warning: "soy" },
    { keyword: "egg", warning: "egg" }
  ];

  for (const rule of allergenRules) {
    if (ingredientText.includes(rule.keyword)) {
      if (!warningText.includes(rule.warning)) {
        errors.push(
          `Ingredient contains "${rule.keyword}" but warning does not mention "${rule.warning}".`
        );
      } else {
        passed.push(`Warning correctly mentions ${rule.warning}.`);
      }
    }
  }

  if (ingredientText.includes("caffeine")) {
    if (!warningText.includes("caffeine")) {
      warnings.push("Contains caffeine but warning does not mention caffeine.");
    } else {
      passed.push("Caffeine warning is present.");
    }
  }

  if (
    ingredientText.includes("aspartame") ||
    ingredientText.includes("acesulfame") ||
    ingredientText.includes("sucralose")
  ) {
    if (!warningText.includes("sweetener")) {
      warnings.push("Contains artificial sweeteners but warning does not mention sweeteners.");
    } else {
      passed.push("Artificial sweetener warning is present.");
    }
  }

  let score = 100;
  score -= errors.length * 20;
  score -= warnings.length * 8;
  score = Math.max(score, 0);

  const status: QaResult["status"] =
    errors.length > 0 ? "FAIL" : warnings.length > 0 ? "WARNING" : "PASS";

  return {
    sku: product.sku,
    productName: product.name,
    status,
    score,
    errors,
    warnings,
    passed
  };
}