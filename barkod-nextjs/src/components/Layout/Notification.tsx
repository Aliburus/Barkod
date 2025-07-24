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
    success: "bg-success-500 text-white",
    error: "bg-danger-500 text-white",
    warning: "bg-warning-500 text-white",
    info: "bg-primary-500 text-white",
  };

  const Icon = icons[type];

  return (
    <div
      className={`${colors[type]} px-4 py-3 flex items-center justify-between animate-slide-up`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/10 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
