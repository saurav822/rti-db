import React, { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument, rgb } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const BASE_SCALE = 1.5;
const MIN_RECT_PX = 5;
const isTouchDevice = typeof window !== "undefined" && "ontouchstart" in window;

function Spinner({ className = "w-5 h-5" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ScrollIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-3" />
      <path d="M12 8l4 4-4 4M16 12H8" />
    </svg>
  );
}

function DrawIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

export default function PDFRedactor({ file, onSave, onSkip, mandatory = false, t }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Refs for touch handlers (avoid stale closures in native event listeners)
  const drawingRef = useRef(false);
  const startPosRef = useRef(null);
  const liveRectRef = useRef(null);
  const pinchRef = useRef({ active: false, dist: 0, startZoom: 1 });
  const lastTouchRef = useRef(null);
  const drawModeRef = useRef(!isTouchDevice);
  const zoomRef = useRef(1.0);
  const rectsRef = useRef([]);
  const pageNumRef = useRef(1);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [viewport, setViewport] = useState(null);
  const [rects, setRects] = useState([]);
  const [liveRect, setLiveRect] = useState(null);
  const [applying, setApplying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [drawMode, setDrawMode] = useState(!isTouchDevice);
  const [zoom, setZoom] = useState(1.0);

  // Keep refs in sync with state
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { rectsRef.current = rects; }, [rects]);
  useEffect(() => { pageNumRef.current = pageNum; }, [pageNum]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const buf = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
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

  // Render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);
    async function render() {
      try {
        if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;
        const vp = page.getViewport({ scale: BASE_SCALE });
        if (cancelled) return;
        setViewport(vp);
        const canvas = canvasRef.current;
        canvas.width = vp.width;
        canvas.height = vp.height;
        const task = page.render({ canvasContext: canvas.getContext("2d"), viewport: vp });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setRendering(false);
      } catch (err) {
        if (!cancelled && err?.name !== "RenderingCancelledException") setRendering(false);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  // Native touch listeners — always attached, read all state via refs
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !isTouchDevice) return;

    function getCanvasPos(touch) {
      const bounds = overlay.getBoundingClientRect();
      return {
        x: (touch.clientX - bounds.left) / zoomRef.current,
        y: (touch.clientY - bounds.top) / zoomRef.current,
      };
    }

    function pinchDist(touches) {
      return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }

    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchRef.current = { active: true, dist: pinchDist(e.touches), startZoom: zoomRef.current };
        drawingRef.current = false;
        startPosRef.current = null;
        setLiveRect(null); liveRectRef.current = null;
        lastTouchRef.current = null;
        return;
      }
      if (e.touches.length === 1) {
        if (drawModeRef.current) {
          e.preventDefault();
          const pos = getCanvasPos(e.touches[0]);
          // Tap existing box → delete it
          const page = pageNumRef.current;
          const current = rectsRef.current.filter(r => r.pageNum === page);
          for (let i = current.length - 1; i >= 0; i--) {
            const r = current[i];
            if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
              setRects(prev => prev.filter(pr => pr !== r));
              return;
            }
          }
          drawingRef.current = true;
          startPosRef.current = pos;
          setLiveRect(null); liveRectRef.current = null;
        } else {
          lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }
    }

    function handleTouchMove(e) {
      if (e.touches.length === 2 && pinchRef.current.active) {
        e.preventDefault();
        const ratio = pinchDist(e.touches) / pinchRef.current.dist;
        const newZoom = Math.min(4, Math.max(0.5, pinchRef.current.startZoom * ratio));
        zoomRef.current = newZoom;
        setZoom(newZoom);
        return;
      }
      if (e.touches.length === 1) {
        if (drawModeRef.current && drawingRef.current && startPosRef.current) {
          e.preventDefault();
          const pos = getCanvasPos(e.touches[0]);
          const sp = startPosRef.current;
          const r = {
            x: Math.min(sp.x, pos.x), y: Math.min(sp.y, pos.y),
            w: Math.abs(pos.x - sp.x), h: Math.abs(pos.y - sp.y),
          };
          liveRectRef.current = r;
          setLiveRect(r);
        } else if (!drawModeRef.current && scrollContainerRef.current) {
          // Manual pan in scroll mode
          if (lastTouchRef.current) {
            scrollContainerRef.current.scrollLeft += lastTouchRef.current.x - e.touches[0].clientX;
            scrollContainerRef.current.scrollTop += lastTouchRef.current.y - e.touches[0].clientY;
          }
          lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }
    }

    function handleTouchEnd(e) {
      if (e.touches.length < 2) pinchRef.current.active = false;
      if (e.touches.length === 0) {
        lastTouchRef.current = null;
        if (drawModeRef.current && drawingRef.current) {
          drawingRef.current = false;
          const lr = liveRectRef.current;
          if (lr && lr.w > MIN_RECT_PX && lr.h > MIN_RECT_PX) {
            const pn = pageNumRef.current;
            setRects(prev => [...prev, { ...lr, pageNum: pn }]);
          }
          setLiveRect(null); liveRectRef.current = null;
          startPosRef.current = null;
        }
      }
    }

    overlay.addEventListener("touchstart", handleTouchStart, { passive: false });
    overlay.addEventListener("touchmove", handleTouchMove, { passive: false });
    overlay.addEventListener("touchend", handleTouchEnd, { passive: false });
    return () => {
      overlay.removeEventListener("touchstart", handleTouchStart);
      overlay.removeEventListener("touchmove", handleTouchMove);
      overlay.removeEventListener("touchend", handleTouchEnd);
    };
  }, [pdfDoc]); // attach once when PDF loads; all state read via refs

  // Mouse handlers (desktop)
  function getMousePos(e) {
    const bounds = overlayRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: (e.clientX - bounds.left) / zoom, y: (e.clientY - bounds.top) / zoom };
  }

  function onMouseDown(e) {
    e.preventDefault();
    const pos = getMousePos(e);
    const pr = rects.filter(r => r.pageNum === pageNum);
    for (let i = pr.length - 1; i >= 0; i--) {
      const r = pr[i];
      if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
        setRects(prev => prev.filter(p => p !== r));
        return;
      }
    }
    drawingRef.current = true;
    startPosRef.current = pos;
    setLiveRect(null);
  }

  function onMouseMove(e) {
    if (!drawingRef.current || !startPosRef.current) return;
    const pos = getMousePos(e);
    const sp = startPosRef.current;
    const r = { x: Math.min(sp.x, pos.x), y: Math.min(sp.y, pos.y), w: Math.abs(pos.x - sp.x), h: Math.abs(pos.y - sp.y) };
    liveRectRef.current = r;
    setLiveRect(r);
  }

  function onMouseUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const lr = liveRectRef.current;
    if (lr && lr.w > MIN_RECT_PX && lr.h > MIN_RECT_PX) {
      setRects(prev => [...prev, { ...lr, pageNum }]);
    }
    setLiveRect(null); liveRectRef.current = null;
    startPosRef.current = null;
  }

  async function handleApply() {
    if (rects.length === 0) return;
    setApplying(true);
    try {
      const pdfLibDoc = await PDFDocument.load(await file.arrayBuffer());
      for (const rect of rects) {
        const page = pdfLibDoc.getPage(rect.pageNum - 1);
        const { height: ph } = page.getSize();
        page.drawRectangle({
          x: rect.x / BASE_SCALE,
          y: ph - (rect.y + rect.h) / BASE_SCALE,
          width: rect.w / BASE_SCALE,
          height: rect.h / BASE_SCALE,
          color: rgb(0, 0, 0), opacity: 1,
        });
      }
      const bytes = await pdfLibDoc.save();
      onSave(new File([bytes], file.name, { type: "application/pdf" }));
    } catch (err) {
      console.error("Redaction failed:", err);
      setApplying(false);
    }
  }

  const pageRects = rects.filter(r => r.pageNum === pageNum);

  if (loadError) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium mb-2 text-[var(--ink)]">{t("redact_load_error")}</p>
        <button onClick={onSkip} className="btn-primary mt-4">{t("redact_skip")}</button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-[var(--ink)] mb-1 hindi-text">{t("redact_title")}</h2>
      <p className="text-sm text-[var(--ink-3)] mb-4 hindi-text">{t("redact_subtitle")}</p>

      {pdfDoc && (
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          {/* Page nav */}
          <div className="flex items-center gap-2">
            <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum === 1} className="btn-secondary py-1 px-3 text-sm disabled:opacity-40">
              ← {t("redact_prev")}
            </button>
            <span className="text-sm mono-text" style={{ color: "var(--ink-3)" }}>
              {t("redact_page_of", { n: pageNum, total: numPages })}
            </span>
            <button onClick={() => setPageNum(p => Math.min(numPages, p + 1))} disabled={pageNum === numPages} className="btn-secondary py-1 px-3 text-sm disabled:opacity-40">
              {t("redact_next")} →
            </button>
          </div>
          {/* Zoom controls + rect count */}
          <div className="flex items-center gap-1.5">
            <button onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))} className="btn-secondary w-7 h-7 flex items-center justify-center font-bold p-0 text-base">−</button>
            <span className="mono-text text-xs w-10 text-center" style={{ color: "var(--ink-3)" }}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.25).toFixed(2))))} className="btn-secondary w-7 h-7 flex items-center justify-center font-bold p-0 text-base">+</button>
            {rects.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full mono-text ml-1" style={{ background: "var(--ink)", color: "#fff" }}>
                ▪ {t("redact_count", { n: rects.length })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mobile: Scroll / Draw toggle */}
      {isTouchDevice && pdfDoc && (
        <>
          <div className="flex items-center gap-1 mb-2 p-1 rounded-[var(--r-sm)]" style={{ background: "var(--rule)" }}>
            <button
              onClick={() => setDrawMode(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--r-sm)] text-sm font-medium transition-all hindi-text"
              style={{
                background: !drawMode ? "var(--surface)" : "transparent",
                color: !drawMode ? "var(--ink)" : "var(--ink-4)",
                boxShadow: !drawMode ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <ScrollIcon />
              {t("redact_mode_scroll")}
            </button>
            <button
              onClick={() => setDrawMode(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--r-sm)] text-sm font-medium transition-all hindi-text"
              style={{
                background: drawMode ? "var(--accent)" : "transparent",
                color: drawMode ? "#fff" : "var(--ink-4)",
                boxShadow: drawMode ? "0 1px 4px rgba(184,134,11,0.3)" : "none",
              }}
            >
              <DrawIcon />
              {t("redact_mode_draw")}
            </button>
          </div>
          <p className="text-xs mb-3 hindi-text" style={{ color: "var(--ink-4)" }}>
            {drawMode ? t("redact_draw_hint") : t("redact_scroll_hint")}
          </p>
        </>
      )}

      {/* Canvas */}
      {!pdfDoc ? (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: "var(--ink-4)" }}>
          <Spinner className="w-6 h-6" />
          <span className="text-sm hindi-text">{t("redact_loading")}</span>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="relative overflow-auto mb-2"
          style={{ maxHeight: "58vh", borderRadius: "var(--r-sm)", border: "1px solid var(--rule)", background: "var(--surface)" }}
        >
          <div className="relative inline-block" style={{ userSelect: "none", zoom }}>
            <canvas ref={canvasRef} className="block" />
            {rendering && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(244,242,232,0.6)" }}>
                <Spinner className="w-6 h-6" />
              </div>
            )}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: viewport?.width, height: viewport?.height }}>
              {pageRects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill="black" />)}
              {liveRect && (
                <rect x={liveRect.x} y={liveRect.y} width={liveRect.w} height={liveRect.h}
                  fill="rgba(0,0,0,0.5)" stroke="black" strokeWidth="1.5" strokeDasharray="4 2" />
              )}
            </svg>
            <div
              ref={overlayRef}
              className="absolute inset-0"
              style={{ cursor: drawMode ? "crosshair" : "grab", touchAction: "none" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            />
          </div>
        </div>
      )}

      {pdfDoc && <p className="text-xs mb-4 hindi-text" style={{ color: "var(--ink-4)" }}>{t("redact_tip")}</p>}

      {mandatory && rects.length === 0 && pdfDoc && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 text-xs rounded-[var(--r-sm)] hindi-text"
          style={{ border: "1px solid rgba(139,94,0,0.30)", background: "var(--accent-glass)", color: "var(--accent)" }}>
          <span>🔒</span>
          <span>{t("redact_mandatory_hint")}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {!mandatory && (
          <button onClick={onSkip} className="btn-secondary hindi-text text-sm">{t("redact_skip_optional")}</button>
        )}
        <button
          onClick={handleApply}
          disabled={applying || rects.length === 0}
          className={`btn-primary disabled:opacity-50 hindi-text ${mandatory ? "w-full" : ""}`}
        >
          {applying ? (
            <span className="flex items-center gap-2"><Spinner className="w-4 h-4" />{t("redact_applying")}</span>
          ) : rects.length > 0 ? `${t("redact_apply")} (${rects.length})` : t("redact_apply_hint")}
        </button>
      </div>
    </div>
  );
}
