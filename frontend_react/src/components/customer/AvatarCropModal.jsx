import { useEffect, useRef, useState } from "react";

const OUTPUT_SIZE = 512;

function AvatarCropModal({ file, onCancel, onConfirm }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [imageUrl, setImageUrl] = useState("");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!drag) return undefined;

    const move = (event) => {
      const point = event.touches?.[0] || event;
      const image = imageRef.current;
      const viewportSize = canvasRef.current?.clientWidth || 0;
      const baseScale = image && viewportSize
        ? Math.min(viewportSize / image.naturalWidth, viewportSize / image.naturalHeight)
        : 1;
      const maxX = image ? Math.max(0, (image.naturalWidth * baseScale * zoom - viewportSize) / 2) : 0;
      const maxY = image ? Math.max(0, (image.naturalHeight * baseScale * zoom - viewportSize) / 2) : 0;
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, drag.originX + point.clientX - drag.startX)),
        y: Math.max(-maxY, Math.min(maxY, drag.originY + point.clientY - drag.startY)),
      });
    };
    const stop = () => setDrag(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", stop);
    };
  }, [drag, zoom]);

  function startDrag(event) {
    const point = event.touches?.[0] || event;
    setDrag({
      startX: point.clientX,
      startY: point.clientY,
      originX: position.x,
      originY: position.y,
    });
  }

  function confirmCrop() {
    const image = imageRef.current;
    const viewport = canvasRef.current;
    if (!image || !viewport) return;

    setBusy(true);
    const viewportSize = viewport.clientWidth;
    const baseScale = Math.min(viewportSize / image.naturalWidth, viewportSize / image.naturalHeight);
    const renderedScale = baseScale * zoom;
    const renderedWidth = image.naturalWidth * renderedScale;
    const renderedHeight = image.naturalHeight * renderedScale;
    const imageLeft = (viewportSize - renderedWidth) / 2 + position.x;
    const imageTop = (viewportSize - renderedHeight) / 2 + position.y;

    const output = document.createElement("canvas");
    output.width = OUTPUT_SIZE;
    output.height = OUTPUT_SIZE;
    const context = output.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.drawImage(
      image,
      -imageLeft / renderedScale,
      -imageTop / renderedScale,
      viewportSize / renderedScale,
      viewportSize / renderedScale,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    output.toBlob((blob) => {
      setBusy(false);
      if (!blob) return;
      const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onConfirm(croppedFile);
    }, "image/jpeg", 0.9);
  }

  if (!file) return null;

  return (
    <div className="vg-avatar-crop-overlay" role="dialog" aria-modal="true" aria-label="Căn chỉnh ảnh đại diện">
      <div className="vg-avatar-crop-modal">
        <header>
          <div>
            <span>ẢNH ĐẠI DIỆN</span>
            <h2>Căn chỉnh ảnh</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Đóng">×</button>
        </header>

        <p>Ảnh gốc được giữ nguyên khi mở. Kéo và phóng ảnh để tự chọn vùng muốn dùng làm ảnh đại diện.</p>
        <div
          ref={canvasRef}
          className="vg-avatar-crop-viewport"
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          {imageUrl ? (
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Ảnh đang căn chỉnh"
              draggable="false"
              style={{ transform: `translate(${position.x / zoom}px, ${position.y / zoom}px) scale(${zoom})` }}
            />
          ) : null}
          <div className="vg-avatar-crop-guide" aria-hidden="true" />
        </div>

        <label className="vg-avatar-crop-zoom">
          <span>Thu nhỏ</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <span>Phóng to</span>
        </label>

        <footer>
          <button type="button" className="secondary" onClick={onCancel}>Chọn ảnh khác</button>
          <button type="button" onClick={confirmCrop} disabled={busy}>{busy ? "Đang xử lý..." : "Dùng ảnh này"}</button>
        </footer>
      </div>
    </div>
  );
}

export default AvatarCropModal;
