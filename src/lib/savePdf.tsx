import { pdf } from "@react-pdf/renderer";
import { invoke } from "@tauri-apps/api/core";
import { ComposerPdf } from "@/server/composer/pdf/ComposerPdf";
import { isTauri } from "./executor";
import {
  buildReportDocument,
  reportFileName,
  type ReportInput,
} from "./reportDocument";

export type SaveOutcome =
  | { status: "saved"; path?: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type { ReportInput };

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // Chunked so a large report cannot blow the argument limit of fromCharCode.
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function downloadInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * The document is rendered in the browser — this app has no Next.js route to
 * call, so it uses react-pdf's client renderer against the same ComposerPdf
 * component the sales tool renders server-side.
 *
 * In the desktop shell the bytes go to Rust, which opens a native save dialog.
 */
export async function saveReportPdf(input: ReportInput): Promise<SaveOutcome> {
  try {
    const doc = buildReportDocument(input);
    const blob = await pdf(<ComposerPdf doc={doc} />).toBlob();
    const fileName = reportFileName();

    if (!isTauri()) {
      downloadInBrowser(blob, fileName);
      return { status: "saved" };
    }

    const path = await invoke<string | null>("save_report_pdf", {
      fileName,
      base64Data: await blobToBase64(blob),
    });

    return path ? { status: "saved", path } : { status: "cancelled" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
