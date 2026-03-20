import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Check } from "lucide-react";

interface SiteCamCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function SiteCamCapture({ onCapture, onClose }: SiteCamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async () => {
    try {
      setCapturedImage(null);
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err: any) {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
    stream?.getTracks().forEach(t => t.stop());
  };

  const handleConfirm = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => { if (blob) onCapture(blob); },
      "image/jpeg",
      0.9
    );
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="relative bg-black">
      <canvas ref={canvasRef} className="hidden" />

      {error ? (
        <div className="p-8 text-center">
          <p className="text-white mb-4">{error}</p>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      ) : capturedImage ? (
        <div className="relative">
          <img src={capturedImage} alt="Captured" className="w-full" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <Button variant="secondary" size="lg" onClick={handleRetake} className="gap-1.5 rounded-full">
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
            <Button size="lg" onClick={handleConfirm} className="gap-1.5 rounded-full">
              <Check className="h-4 w-4" /> Use Photo
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <Button
              size="lg"
              onClick={handleCapture}
              className="h-16 w-16 rounded-full bg-white hover:bg-white/90 border-4 border-white/30"
            >
              <Camera className="h-6 w-6 text-black" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 text-white hover:bg-white/20"
            onClick={() => setFacingMode(f => f === "user" ? "environment" : "user")}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 text-white hover:bg-white/20"
        onClick={() => { stream?.getTracks().forEach(t => t.stop()); onClose(); }}
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
