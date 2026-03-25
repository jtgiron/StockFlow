import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  maxTimeBetweenKeys?: number;
  minLength?: number;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxTimeBetweenKeys = 50,
  minLength = 4,
}: UseBarcodeOptions) {
  const buffer = useRef("");
  const lastKeyTime = useRef(0);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isTyping && target.getAttribute("data-barcode-aware") !== "true")
        return;

      const now = Date.now();

      if (now - lastKeyTime.current > maxTimeBetweenKeys) {
        buffer.current = "";
      }

      if (e.key === "Enter") {
        if (buffer.current.length >= minLength) {
          e.preventDefault();
          onScanRef.current(buffer.current);
        }
        buffer.current = "";
        return;
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
        lastKeyTime.current = now;
      }
    },
    [enabled, maxTimeBetweenKeys, minLength],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);
}
