import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, rgb } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const RENDER_SCALE = 1.5;
const MIN_RECT_PX = 5;

function Spinner({ className = "w-5 h-5" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function PDFRedactor({ file, onSave, onSkip, mandatory = false, t }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [viewport, setViewport] = useState(null);
  const [rects, setRects] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [liveRect, setLiveRect] = useState(null);
  const [applying, setApplying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [file]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);

    async function render() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const vp = page.getViewport({ scale: RENDER_SCALE });
        if (cancelled) return;
        setViewport(vp);
        const canvas = canvasRef.current;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d");
        const task = page.render({ canvasContext: ctx, viewport: vp });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") {
          console.error("PDF render error:", err);
          setRendering(false);
        }
      }
    }
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  function getPos(e) {
    const el = overlayRef.current;
    if (!el) return { x: 0, y: 0 };
    const bounds = el.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    return { x: client.clientX - bounds.left, y: client.clientY - bounds.top };
  }

  function onPointerDown(e) {
    e.preventDefault();
    const pos = getPos(e);
    const pageRects = rects.filter((r) => r.pageNum === pageNum);
    for (let i = pageRects.length - 1; i >= 0; i--) {
      const r = pageRects[i];
      if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        setRects((prev) => prev.filter((pr) => pr !== r));
        return;
      }
    }
    setDrawing(true);
    setStartPos(pos);
    setLiveRect(null);
  }

  function onPointerMove(e) {
    if (!drawing || !startPos) return;
    e.preventDefault();
    const pos = getPos(e);
    setLiveRect({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    });
  }

  function onPointerUp() {
    if (!drawing) return;
    setDrawing(false);
    if (liveRect && liveRect.w > MIN_RECT_PX && liveRect.h > MIN_RECT_PX) {
      setRects((prev) => [...prev, { ...liveRect, pageNum }]);
    }
    setLiveRect(null);
    setStartPos(null);
  }

  async function handleApply() {
    if (rects.length === 0) return;
    setApplying(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);

      for (const rect of rects) {
        const page = pdfLibDoc.getPage(rect.pageNum - 1);
        const { height: pageHeight } = page.getSize();
        const pdfX = rect.x / RENDER_SCALE;
        const pdfY = pageHeight - (rect.y + rect.h) / RENDER_SCALE;
        const pdfW = rect.w / RENDER_SCALE;
        const pdfH = rect.h / RENDER_SCALE;
        page.drawRectangle({ x: pdfX, y: pdfY, width: pdfW, height: pdfH, color: rgb(0, 0, 0), opacity: 1 });
      }

      const modifiedBytes = await pdfLibDoc.save();
      const redactedFile = new File([modifiedBytes], file.name, { type: "application/pdf" });
      onSave(redactedFile);
    } catch (err) {
      console.error("Redaction failed:", err);
      setApplying(false);
    }
  }

  const pageRects = rects.filter((r) => r.pageNum === pageNum);
  const totalRects = rects.length;

  if (loadError) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="font-medium mb-2 text-[var(--ink)]">{t("redact_load_error")}</p>
        <button onClick={onSkip} className="btn-primary mt-4">{t("redact_skip")}</button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <h2 className="text-lg font-semibold text-[var(--ink)] mb-1 hindi-text">{t("redact_title")}</h2>
      <p className="text-sm text-[var(--ink-3)] mb-4 hindi-text">{t("redact_subtitle")}</p>

      {/* Toolbar */}
      {pdfDoc && (
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPageNum((p) => Math.max(1, p - 1))}
              disabled={pageNum === 1}
              className="btn-secondary py-1 px-3 text-sm disabled:opacity-40"
            >
              ← {t("redact_prev")}
            </button>
            <span className="text-sm text-[var(--ink-3)] mono-text">
              {t("redact_page_of", { n: pageNum, total: numPages })}
            </span>
            <button
              onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
              disabled={pageNum === numPages}
              className="btn-secondary py-1 px-3 text-sm disabled:opacity-40"
            >
              {t("redact_next")} →
            </button>
          </div>
          {totalRects > 0 && (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full mono-text"
              style={{ background: "var(--ink)", color: "#fff" }}
            >
              ▪ {t("redact_count", { n: totalRects })}
            </span>
          )}
        </div>
      )}

      {/* Canvas area */}
      {!pdfDoc ? (
        <div className="flex items-center justify-center py-20 text-[var(--ink-4)] gap-3">
          <Spinner className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <span className="text-sm hindi-text">{t("redact_loading")}</span>
        </div>
      ) : (
        <div
          className="relative overflow-auto mb-2"
          style={{ maxHeight: "58vh", borderRadius: "var(--r-sm)", border: "1px solid var(--rule)", background: "var(--surface)" }}
        >
          <div className="relative inline-block" style={{ userSelect: "none" }}>
            <canvas ref={canvasRef} className="block" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(244,242,232,0.6)" }}>
                <Spinner className="w-6 h-6" style={{ color: "var(--accent)" }} />
              </div>
            )}
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: viewport?.width, height: viewport?.height }}
            >
              {pageRects.map((r, i) => (
                <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />
              ))}
              {liveRect && (
                <rect
                  x={liveRect.x} y={liveRect.y}
                  width={liveRect.w} height={liveRect.h}
                  fill="rgba(0,0,0,0.55)"
                  stroke="black" strokeWidth="1.5" strokeDasharray="4 2"
                />
              )}
            </svg>
            <div
              ref={overlayRef}
              className="absolute inset-0"
              style={{ cursor: "crosshair", touchAction: "none" }}
              onMouseDown={onPointerDown}
              onMouseMove={onPointerMove}
              onMouseUp={onPointerUp}
              onMouseLeave={onPointerUp}
              onTouchStart={onPointerDown}
              onTouchMove={onPointerMove}
              onTouchEnd={onPointerUp}
            />
          </div>
        </div>
      )}

      {pdfDoc && (
        <p className="text-xs text-[var(--ink-4)] mb-4 hindi-text">{t("redact_tip")}</p>
      )}
      {mandatory && rects.length === 0 && pdfDoc && (
        <div
          className="mb-4 flex items-center gap-2 px-3 py-2 text-xs rounded-[var(--r-sm)] hindi-text"
          style={{ border: "1px solid rgba(139,94,0,0.30)", background: "var(--amber-bg)", color: "var(--amber)" }}
        >
          <span>🔒</span>
          <span>{t("redact_mandatory_hint")}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {!mandatory && (
          <button onClick={onSkip} className="btn-secondary hindi-text text-sm">
            {t("redact_skip_optional")}
          </button>
        )}
        <button
          onClick={handleApply}
          disabled={applying || rects.length === 0}
          className={`btn-primary disabled:opacity-50 hindi-text ${mandatory ? "w-full" : ""}`}
        >
          {applying ? (
            <span className="flex items-center gap-2">
              <Spinner className="w-4 h-4" />
              {t("redact_applying")}
            </span>
          ) : (
            rects.length > 0
              ? `${t("redact_apply")} (${rects.length})`
              : t("redact_apply_hint")
          )}
        </button>
      </div>
    </div>
  );
}
