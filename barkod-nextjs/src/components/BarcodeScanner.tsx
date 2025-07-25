"use client";
import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, CameraOff, Scan, Keyboard } from "lucide-react";
import { ScanResult } from "../types";

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  isActive: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  isActive,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [scannerType, setScannerType] = useState<"camera" | "manual">("camera");
  const [manualInput, setManualInput] = useState("");
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanning = React.useCallback(
    async (deviceId: string) => {
      if (!codeReaderRef.current || !videoRef.current) return;
      try {
        setIsScanning(true);
        setScanLocked(false);
        await codeReaderRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result) => {
            if (result && !scanLocked) {
              setScanLocked(true);
              onScan({
                text: result.getText(),
                format: result.getBarcodeFormat().toString(),
              });
              if (scanLocked === false) {
                setTimeout(() => stopScanning(), 300);
              }
            }
          }
        );
      } catch {
        setIsScanning(false);
      }
    },
    [onScan, scanLocked]
  );

  const initializeScanner = React.useCallback(async () => {
    try {
      codeReaderRef.current = new BrowserMultiFormatReader();
      const videoDevices =
        await BrowserMultiFormatReader.listVideoInputDevices();
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        let deviceId = selectedDevice;
        if (!deviceId) {
          const backCam = videoDevices.find(
            (d) =>
              d.label.toLowerCase().includes("back") ||
              d.label.toLowerCase().includes("environment")
          );
          deviceId = backCam ? backCam.deviceId : videoDevices[0].deviceId;
        }
        setSelectedDevice(deviceId);
        startScanning(deviceId);
      }
    } catch (e) {
      console.error("Error initializing scanner:", e);
    }
  }, [selectedDevice, startScanning]);

  useEffect(() => {
    if (isActive && scannerType === "camera") {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isActive, scannerType, selectedDevice, initializeScanner]);

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan({
        text: manualInput.trim(),
        format: "MANUAL",
      });
      setManualInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Barkod okuyucu genellikle Enter tuşu ile sonlandırır
    if (e.key === "Enter" && manualInput.trim()) {
      onScan({
        text: manualInput.trim(),
        format: "SCANNER",
      });
      setManualInput("");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-colors pt-safe-top pb-safe-bottom sm:p-8 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
          Barkod Tarayıcı
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setScannerType("camera")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              scannerType === "camera"
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <Camera className="w-4 h-4 inline mr-1" />
            Kamera
          </button>
          <button
            onClick={() => setScannerType("manual")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              scannerType === "manual"
                ? "bg-primary-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <Keyboard className="w-4 h-4 inline mr-1" />
            Manuel
          </button>
        </div>
      </div>

      {scannerType === "camera" ? (
        <div>
          {devices.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kamera Seçin:
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {devices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Kamera ${device.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-64 bg-black rounded-md object-cover"
              style={{ display: isScanning ? "block" : "none" }}
            />
            {!isScanning && (
              <div className="w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Kamera bekleniyor...
                  </p>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 border-2 border-success-500 rounded-md pointer-events-none">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-48 h-32 border-2 border-danger-500 bg-transparent"></div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary-600" />
              <span
                className={`text-sm ${
                  isScanning
                    ? "text-success-600"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isScanning ? "Tarama aktif" : "Tarama bekleniyor"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Barkod Girin (Manuel veya Barkod Okuyucu):
              </label>
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Barkod numarasını girin..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                autoFocus={scannerType === "manual"}
                inputMode="numeric"
              />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              <Scan className="w-4 h-4 inline mr-2" />
              Barkod Ara
            </button>
          </form>

          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md">
            <p className="text-sm text-primary-800 dark:text-primary-300">
              <strong>İpucu:</strong> Barkod okuyucunuz varsa, bu alana
              odaklanın ve barkodu okutun. Barkod otomatik olarak girilecek ve
              Enter tuşuna basılacaktır.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;
