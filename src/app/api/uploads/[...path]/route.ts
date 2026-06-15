import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageProvider } from "@/lib/storage/storage.provider";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new Response("Bad Request", { status: 400 });
    }

    // Reconstruct key
    const key = pathSegments.join("/");

    // 1. Enforce IDOR Checks based on directory/key structure
    if (
      key.startsWith("trade-screenshots/") ||
      key.startsWith("annotated-images/")
    ) {
      // Find the image in the DB and check ownership of the associated trade
      const imageRecord = await prisma.tradeImage.findFirst({
        where: { key },
        include: {
          trade: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!imageRecord) {
        return new Response("File Not Found in Database", { status: 404 });
      }

      if (imageRecord.trade.account.userId !== session.user.id) {
        return new Response("Forbidden", { status: 403 });
      }

      // Read from storage provider and stream response
      const stream = await storageProvider.getFileStream(key);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
      });

      return new Response(webStream, {
        headers: {
          "Content-Type": imageRecord.mimeType || "image/webp",
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }

    if (key.startsWith("reports/") || key.startsWith("exports/")) {
      // Reports and exports files must start with the userId to prevent IDOR
      const filename = pathSegments[pathSegments.length - 1];
      if (!filename.startsWith(session.user.id)) {
        return new Response("Forbidden", { status: 403 });
      }

      const stream = await storageProvider.getFileStream(key);
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
      });

      let contentType = "application/octet-stream";
      if (filename.endsWith(".csv")) contentType = "text/csv";
      else if (filename.endsWith(".pdf")) contentType = "application/pdf";
      else if (filename.endsWith(".xlsx")) {
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      }

      return new Response(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename.substring(session.user.id.length + 1)}"`,
        },
      });
    }

    return new Response("Access to directory is restricted", { status: 403 });
  } catch (error: any) {
    console.error("Error serving uploaded file:", error);
    if (error.message?.includes("File not found")) {
      return new Response("File Not Found on Disk", { status: 404 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}
