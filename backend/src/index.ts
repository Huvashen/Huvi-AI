import "dotenv/config";
import { HfInference } from "@huggingface/inference";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { findRelevantProducts } from "./tools/productTools.js";
import {
  findProductBySkuTool,
  searchProductsTool,
  getAllProducts
} from "./tools/productTools.js";

const hf = new HfInference(process.env.HUGGINGFACEHUB_API_TOKEN);

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const conversationHistory: ChatMessage[] = [];

type ToolDecision =
  | {
      tool: "find_product_by_sku";
      input: {
        sku: string;
      };
    }
  | {
      tool: "search_products";
      input: {
        query: string;
      };
    }
  | {
      tool: "get_all_products";
      input: {};
    };

async function askHuggingFace(prompt: string): Promise<string> {
  const response = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful product support assistant. Answer only using the supplied product data. If the answer is not in the product data, say that you could not find it in the product data."
      },
      ...conversationHistory.slice(-10),
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 300
  });

  return response.choices[0]?.message?.content ?? "No response generated.";
}

async function decideTool(question: string): Promise<ToolDecision> {
  const response = await hf.chatCompletion({
    model: "Qwen/Qwen2.5-7B-Instruct",
    messages: [
      {
        role: "system",
        content: `
You decide which product data tool should be used.

Available tools:

1. find_product_by_sku
Use when the question contains a specific SKU like CHOCO-001, JUICE-002, or BREAD-003.
Input shape:
{ "sku": "CHOCO-001" }

2. search_products
Use when the user asks about a clear keyword like gluten, peanuts, SweetCo, bakery, beverage, milk.
Input shape:
{ "query": "gluten" }

3. get_all_products
Use when the question asks broadly across all products, such as:
- list all products
- what should be refrigerated after opening
- compare products
- which products have warnings
Input shape:
{}

Return ONLY valid JSON. No markdown. No explanation.

Example:
{
  "tool": "search_products",
  "input": {
    "query": "gluten"
  }
}
`
      },
      {
        role: "user",
        content: question
      }
    ],
    max_tokens: 120
  });

  const raw = response.choices[0]?.message?.content ?? "";

  try {
    return JSON.parse(raw) as ToolDecision;
  } catch {
    return {
      tool: "get_all_products",
      input: {}
    };
  }
}

async function runSelectedTool(decision: ToolDecision): Promise<string> {
  switch (decision.tool) {
    case "find_product_by_sku":
      return await findProductBySkuTool.invoke({
        sku: decision.input.sku
      });

    case "search_products":
      const relevant = findRelevantProducts(decision.input.query);
      return JSON.stringify(relevant, null, 2);

    case "get_all_products":
      return JSON.stringify(getAllProducts(), null, 2);

    default:
      return JSON.stringify(getAllProducts(), null, 2);
  }
}

async function main() {
  console.log("Mini Product Support Agent started.");
  console.log("Ask a question about the product data.");
  console.log("Type 'exit' to quit.\n");

  const rl = readline.createInterface({ input, output });

  while (true) {
    const question = await rl.question("You: ");

    if (question.trim().toLowerCase() === "exit") {
      break;
    }

    const decision = await decideTool(question);
    const productContext = await runSelectedTool(decision);

    const answer = await askHuggingFace(`
Tool used:
${decision.tool}

Product data:
${productContext}

User question:
${question}
`);

    console.log(`\nAgent: ${answer}\n`);

    conversationHistory.push({
        role: "user",
        content: question
        });

        conversationHistory.push({
        role: "assistant",
        content: answer
        });
  }

  rl.close();
}

main().catch((error) => {
  console.error("Application error:", error);

  if (error?.httpResponse?.body) {
    console.error("Hugging Face error body:");
    console.error(JSON.stringify(error.httpResponse.body, null, 2));
  }
});