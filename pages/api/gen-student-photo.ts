// pages/api/gen-student-photo.ts

import type { NextApiRequest, NextApiResponse } from "next";

// Bạn cần cài @google/genai: npm install @google/genai
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_GENAI_API_KEY as string; // Đặt API key vào file .env.local

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
    const genAI = new GoogleGenAI({ apiKey });
    const model = genAI.getGenerativeModel({
      model: "models/imagegeneration",
    });

    const result = await model.generateContent(prompt);

    // Lấy dữ liệu ảnh base64 từ response
    const imgData =
      result.response.candidates[0].content.parts[0].inlineData.data;

    res.status(200).json({ image: imgData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
