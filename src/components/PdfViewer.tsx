import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { downloadReceipt } from "../services/tauri";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfViewerProps {
  receiptId: string;
  onClose: () => void;
}

export function PdfViewer({ receiptId, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.0);

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    },
    [pdfDoc, scale],
  );

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Download PDF data from Dropbox
        const data = await downloadReceipt(receiptId);

        if (cancelled) return;

        // Create blob URL from data (stays in memory, not on disk)
        const blob = new Blob([data as BlobPart], { type: "application/pdf" });
        blobUrl = URL.createObjectURL(blob);

        // Load PDF document
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;

        if (cancelled) {
          pdf.destroy();
          return;
        }

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, [receiptId]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, renderPage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      }
    },
    [currentPage, totalPages, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="pdf-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pdf-modal-header">
        <h3>Receipt Viewer</h3>
        <div className="pdf-controls">
          {totalPages > 1 && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </button>
              <span className="page-indicator">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
          >
            -
          </button>
          <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
          >
            +
          </button>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="pdf-modal-content">
        {isLoading && <div className="loading">Loading PDF...</div>}
        {error && <div className="error-message">{error}</div>}
        <canvas ref={canvasRef} style={{ display: isLoading ? "none" : "block" }} />
      </div>
    </div>
  );
}
