import { useCallback } from 'react';
import { toPng, toSvg } from 'html-to-image';

const HIDE_CLASS = 'export-hide-ui';

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function useExport() {
  const exportPng = useCallback(async (element: HTMLElement | null) => {
    if (!element) return;
    document.body.classList.add(HIDE_CLASS);
    try {
      const dataUrl = await toPng(element, { cacheBust: true });
      triggerDownload(dataUrl, 'canvas.png');
    } finally {
      document.body.classList.remove(HIDE_CLASS);
    }
  }, []);

  const exportSvg = useCallback(async (element: HTMLElement | null) => {
    if (!element) return;
    document.body.classList.add(HIDE_CLASS);
    try {
      const dataUrl = await toSvg(element, { cacheBust: true });
      triggerDownload(dataUrl, 'canvas.svg');
    } finally {
      document.body.classList.remove(HIDE_CLASS);
    }
  }, []);

  return { exportPng, exportSvg };
}
