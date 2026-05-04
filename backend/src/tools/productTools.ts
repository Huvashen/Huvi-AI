import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

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

const productsPath = path.join(process.cwd(), "src", "data", "products.json");

function loadProducts(): Product[] {
  const file = fs.readFileSync(productsPath, "utf-8");
  return JSON.parse(file) as Product[];
}

export const findProductBySkuTool = tool(
  async ({ sku }) => {
    const products = loadProducts();

    const product = products.find(
      (p) => p.sku.toLowerCase() === sku.toLowerCase()
    );

    if (!product) {
      return `No product found with SKU: ${sku}`;
    }

    return JSON.stringify(product, null, 2);
  },
  {
    name: "find_product_by_sku",
    description:
      "Find a product by SKU. Use this when the user asks about one specific product code or SKU.",
    schema: z.object({
      sku: z.string().describe("The product SKU, for example CHOCO-001")
    })
  }
);

export const searchProductsTool = tool(
  async ({ query }) => {
    const products = loadProducts();
    const search = query.toLowerCase();

    const matches = products.filter((p) => {
      return (
        p.sku.toLowerCase().includes(search) ||
        p.name.toLowerCase().includes(search) ||
        p.brand.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search) ||
        p.ingredients.some((i) => i.toLowerCase().includes(search)) ||
        p.warnings.some((w) => w.toLowerCase().includes(search))
      );
    });

    if (matches.length === 0) {
      return `No products matched query: ${query}`;
    }

    return JSON.stringify(matches, null, 2);
  },
  {
    name: "search_products",
    description:
      "Search products by name, brand, category, ingredient, warning, or keyword.",
    schema: z.object({
      query: z.string().describe("Search term, for example peanuts, SweetCo, gluten")
    })
  }
);

export function getAllProducts(): Product[] {
  return loadProducts();
}

export function findRelevantProducts(query: string): Product[] {
  const products = loadProducts();
  const q = query.toLowerCase();

  return products
    .map((product) => {
      let score = 0;

      if (product.name.toLowerCase().includes(q)) score += 3;
      if (product.brand.toLowerCase().includes(q)) score += 2;
      if (product.category.toLowerCase().includes(q)) score += 2;

      if (product.ingredients.some((i) => i.toLowerCase().includes(q))) {
        score += 4;
      }

      if (product.warnings.some((w) => w.toLowerCase().includes(q))) {
        score += 4;
      }

      if (product.storage.toLowerCase().includes(q)) score += 2;
      if (product.description.toLowerCase().includes(q)) score += 1;

      return { product, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.product);
}