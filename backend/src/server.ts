import "dotenv/config";
import express from "express";
import cors from "cors";
import { HfInference } from "@huggingface/inference";
import {
  findProductBySkuTool,
  searchProductsTool,
  getAllProducts
} from "./tools/productTools.js";

const app = express();
const port = 3001;

const hf = new HfInference(process.env.HUGGINGFACEHUB_API_TOKEN);

app.use(cors());
app.use(express.json());

async function askHuggingFace(prompt: string): Promise<string> {
  const response = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content:
          "You are Huvi AI, a helpful product assistant. Answer only using the supplied product data. If the answer is not in the product data, say that you could not find it in the product data."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 300
  });

  return response.choices[0]?.message?.content ?? "No response generated.";
}

function extractSku(question: string): string | null {
  const skuPattern = /\b[A-Z]+-\d+\b/i;
  const match = question.match(skuPattern);

  return match ? match[0].toUpperCase() : null;
}

async function getProductContext(question: string): Promise<string> {
  const sku = extractSku(question);

  if (sku) {
    return await findProductBySkuTool.invoke({ sku });
  }

  return JSON.stringify(getAllProducts(), null, 2);
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    app: "Huvi AI API"
  });
});

app.get("/api/products", (_req, res) => {
  res.json(getAllProducts());
});

app.post("/api/ask", async (req, res) => {
  try {
    const question = String(req.body.question ?? "");

    if (!question.trim()) {
      return res.status(400).json({
        error: "Question is required."
      });
    }

    const productContext = await getProductContext(question);

    const answer = await askHuggingFace(`
Product data:
${productContext}

User question:
${question}
`);

    return res.json({
      question,
      answer
    });
  } catch (error: any) {
    console.error("Ask API error:", error);

    return res.status(500).json({
      error: "Failed to process AI question."
    });
  }
});

app.post("/api/qa-check", async (req, res) => {
  try {
    const sku = String(req.body.sku ?? "");

    if (!sku.trim()) {
      return res.status(400).json({
        error: "SKU is required."
      });
    }

    const productContext = await findProductBySkuTool.invoke({ sku });

    const answer = await askHuggingFace(`
Product data:
${productContext}

Task:
Run a QA check on this product.

Check:
- Missing product fields
- Allergen warnings
- Storage instructions
- Any obvious product safety notes

Return a short bullet-point summary.
`);

    return res.json({
      sku,
      answer
    });
  } catch (error: any) {
    console.error("QA Check API error:", error);

    return res.status(500).json({
      error: "Failed to run QA check."
    });
  }
});

app.listen(port, () => {
  console.log(`Huvi AI API running on http://localhost:${port}`);
});