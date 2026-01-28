"use client";

import { Html5Qrcode } from "html5-qrcode";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type QrCodeScannerProps = {
  onScan: (value: string) => void;
};

export function QrCodeScanner({ onScan }: QrCodeScannerProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const readerIdRef = React.useRef(
    `qr-reader-${Math.random().toString(36).slice(2, 10)}`
  );
  const qrCodeRef = React.useRef<Html5Qrcode | null>(null);
  const initTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  React.useEffect(() => {
    if (!open) {
      setError(null);
      return;
    }

    const startScanner = () => {
      const target = document.getElementById(readerIdRef.current);
      if (!target) {
        initTimeoutRef.current = setTimeout(startScanner, 80);
        return;
      }

      const html5QrCode = new Html5Qrcode(readerIdRef.current);
      qrCodeRef.current = html5QrCode;

      html5QrCode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText);
            setOpen(false);
          },
          () => {}
        )
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Unable to access the camera."
          );
        });
    };

    startScanner();

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      if (!qrCodeRef.current) return;
      qrCodeRef.current
        .stop()
        .catch(() => {})
        .finally(() => {
          qrCodeRef.current?.clear();
          qrCodeRef.current = null;
        });
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" type="button">
          Scan QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan login code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code to fill the login code.
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full justify-center rounded-lg border bg-muted/30 p-2">
          <div id={readerIdRef.current} className="w-full" />
        </div>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
