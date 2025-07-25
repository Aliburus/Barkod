"use client";
import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";

interface NotificationProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: "bg-green-600 border-green-700 text-white shadow-lg",
    error: "bg-red-600 border-red-700 text-white shadow-lg",
    warning: "bg-yellow-400 border-yellow-600 text-gray-900 shadow-lg",
    info: "bg-blue-600 border-blue-700 text-white shadow-lg",
  };

  const Icon = icons[type];

  return (
    <div
      className={`${colors[type]} px-5 py-3 flex items-center justify-between rounded-xl border-2 animate-slide-up transition-all duration-300`}
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6 opacity-90" />
        <span className="text-base font-semibold tracking-tight">
          {message}
        </span>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/20 hover:text-black rounded-full transition-colors"
        title="Kapat"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Notification;
