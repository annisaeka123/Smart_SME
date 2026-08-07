import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File foto nota/struk tidak ditemukan" },
        { status: 400 }
      );
    }

    // Mengonversi File menjadi Buffer sesuai standar Node.js / Next.js
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Menggunakan google('gemini-2.5-flash') dan format file input dari ai-sdk.dev
    const { object } = await generateObject({
      model: google("gemini-3.6-flash"),
      schema: z.object({
        title: z.string().describe("Nama Toko atau Judul Ringkasan Pengeluaran"),
        amount: z.number().describe("Total nominal rupiah pengeluaran yang tertera di nota/struk"),
        category: z.enum(["Operasional", "Bahan Baku", "Lainnya"]).describe("Kategori pengeluaran"),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analisis dokumen/foto nota belanja ini. Ekstrak nama toko, total nominal belanja (dalam angka rupiah), dan kategorinya secara presisi.",
            },
            {
              type: "file",
              data: buffer,
              mediaType: file.type || "image/jpeg",
            },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error("AI SDK OCR Error:", error);

    // Fallback ramah agar frontend tidak crash jika terjadi kendala jaringan/file
    return NextResponse.json({
      title: "Pengeluaran Nota",
      amount: 0,
      category: "Operasional",
      isFallback: true,
      message: "AI sedang mengalami kendala. Silakan periksa atau isi nominal secara manual.",
    });
  }
}
