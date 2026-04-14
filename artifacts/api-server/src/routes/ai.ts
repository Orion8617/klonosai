import { Router, type Request, type Response } from "express";
import { DefaultAzureCredential } from "@azure/identity";
import { AIProjectClient } from "@azure/ai-projects";

const router = Router();

// Lazy-load the client so the app doesn't crash if env vars are missing at startup
let projectClient: AIProjectClient | null = null;

function getAIClient() {
  if (projectClient) return projectClient;

  const endpoint = process.env["AZURE_AI_PROJECT_ENDPOINT"];
  if (!endpoint) {
    throw new Error("AZURE_AI_PROJECT_ENDPOINT is not configured.");
  }

  projectClient = new AIProjectClient(endpoint, new DefaultAzureCredential());
  return projectClient;
}

// ─── Chat with Foundry Models ───────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, model } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const project = getAIClient();

    // Obtain an OpenAI-compatible client from the Azure AI Project
    const openAIClient = await project.getOpenAIClient();

    const deploymentName = model || process.env["AZURE_AI_DEFAULT_MODEL"] || "gpt-4o";

    const response = await openAIClient.chat.completions.create({
      model: deploymentName,
      messages: [{ role: "user", content: message }],
    });

    res.json({
      success: true,
      response: response.choices[0]?.message.content,
      model: response.model,
    });
  } catch (error) {
    console.error("AI Project Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    res.status(500).json({ error: msg });
  }
});

export default router;
