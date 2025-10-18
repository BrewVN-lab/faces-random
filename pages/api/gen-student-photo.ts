// pages/api/gen-student-photo.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GENAI_API_KEY as string;

const prompt =
  "A student ID photo, Asian male, white background, neutral face, professional, high resolution";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!apiKey) {
    res.status(500).json({ error: "GOOGLE_GENAI_API_KEY not set" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Check: có thể là getModel (tuỳ phiên bản)
    const model = genAI.getModel("models/imagegeneration");

    // Một số SDK yêu cầu định dạng contents như sau:
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    // Có thể cần đọc response base64 như sau (tùy phiên bản SDK, bạn console.log(result) để kiểm tra):
    const imgData =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!imgData) {
      return res.status(500).json({ error: "No image data returned from GenAI" });
    }

    res.status(200).json({ image: imgData });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Unknown error" });
  }
}
