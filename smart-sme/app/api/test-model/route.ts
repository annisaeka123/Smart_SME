import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function GET() {
  try {
    const result = await generateText({
      model: google("gemini-3.6-flash"),
      prompt: "Say hello",
    });

    return Response.json({
      success: true,
      text: result.text,
    });
  } catch (error) {
    console.error(error);
    return Response.json(error);
  }
}