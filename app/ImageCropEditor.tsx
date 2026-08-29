"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

type Crop = { x: number; y: number; width: number; height: number };
type DragMode = "move" | "nw" | "ne" | "sw" | "se";

export default function ImageCropEditor({
  file,
  title,
  onClose,
  onSave,
}: {
  file: File;
  title: string;
  onClose: () => void;
  onSave: (file: File) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [crop, setCrop] = useState<Crop>({ x: 8, y: 8, width: 84, height: 84 });
  const drag = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    initial: Crop;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function startDrag(event: PointerEvent<HTMLElement>, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    const stage = event.currentTarget.closest(".cropStage");
    if (!(stage instanceof HTMLElement)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: crop,
      width: stage.clientWidth,
      height: stage.clientHeight,
    };
  }

  function moveCrop(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) return;
    const dx = ((event.clientX - current.startX) / current.width) * 100;
    const dy = ((event.clientY - current.startY) / current.height) * 100;
    const minimum = 12;
    let { x, y, width, height } = current.initial;

    if (current.mode === "move") {
      x = Math.max(0, Math.min(100 - width, x + dx));
      y = Math.max(0, Math.min(100 - height, y + dy));
    } else {
      if (current.mode.includes("w")) {
        const right = x + width;
        x = Math.max(0, Math.min(right - minimum, x + dx));
        width = right - x;
      }
      if (current.mode.includes("e")) width = Math.max(minimum, Math.min(100 - x, width + dx));
      if (current.mode.includes("n")) {
        const bottom = y + height;
        y = Math.max(0, Math.min(bottom - minimum, y + dy));
        height = bottom - y;
      }
      if (current.mode.includes("s")) height = Math.max(minimum, Math.min(100 - y, height + dy));
    }

    setCrop({ x, y, width, height });
  }

  async function saveCrop() {
    if (!previewUrl) return;
    try {
      setSaving(true);
      const image = new Image();
      image.src = previewUrl;
      await image.decode();
      const sourceX = Math.round((crop.x / 100) * image.width);
      const sourceY = Math.round((crop.y / 100) * image.height);
      const sourceWidth = Math.max(1, Math.round((crop.width / 100) * image.width));
      const sourceHeight = Math.max(1, Math.round((crop.height / 100) * image.height));
      const scale = Math.min(1, 1600 / sourceWidth, 1600 / sourceHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Crop editor could not start.");
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error("Could not save crop.")),
          "image/jpeg",
          0.9
        );
      });
      onSave(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="imageEditorBackdrop" onMouseDown={() => !saving && onClose()}>
      <section className="imageEditorModal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="imageEditorHeader">
          <div><span className="eyebrow">PHOTO EDITOR</span><h2>{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close crop editor">×</button>
        </div>
        <div className="imageEditorViewport">
          <div className="cropStage" onPointerMove={moveCrop} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {previewUrl && <img src={previewUrl} alt="Crop preview" />}
            <div className="cropSelection" style={{ left: `${crop.x}%`, top: `${crop.y}%`, width: `${crop.width}%`, height: `${crop.height}%` }} onPointerDown={(event) => startDrag(event, "move")}>
              <span className="cropGrid cropGridOne" /><span className="cropGrid cropGridTwo" />
              {(["nw", "ne", "sw", "se"] as DragMode[]).map((mode) => <button key={mode} type="button" className={`cropHandle ${mode}`} aria-label={`Resize crop ${mode}`} onPointerDown={(event) => startDrag(event, mode)} />)}
            </div>
          </div>
          <span>Drag the box or corners to select the crop</span>
        </div>
        <div className="imageEditorToolbar">
          <button type="button" onClick={() => setCrop({ x: 0, y: 0, width: 100, height: 100 })}>Use full image</button>
          <button type="button" onClick={() => setCrop({ x: 8, y: 8, width: 84, height: 84 })}>Reset crop</button>
        </div>
        <div className="imageEditorActions">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="primary" onClick={saveCrop} disabled={saving}>{saving ? "Saving..." : "Save cropped image"}</button>
        </div>
      </section>
    </div>
  );
}

