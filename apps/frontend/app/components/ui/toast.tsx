import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
    description?: string;
    duration?: number;
}

const baseClassNames = {
    title: "text-[14px] font-semibold",
    description: "text-[13px] text-[#a3a8a7]",
};

export const toast = {
    success: (message: string, options?: ToastOptions) =>
        sonnerToast.success(message, {
            ...options,
            icon: <CheckCircle size={18} className="text-[#bca066]" />,
            classNames: {
                ...baseClassNames,
                icon: "text-[#bca066]",
            },
        }),

    error: (message: string, options?: ToastOptions) =>
        sonnerToast.error(message, {
            ...options,
            icon: <XCircle size={18} className="text-[#e05c5c]" />,
            classNames: {
                ...baseClassNames,
                icon: "text-[#e05c5c]",
            },
        }),

    info: (message: string, options?: ToastOptions) =>
        sonnerToast.info(message, {
            ...options,
            icon: <Info size={18} className="text-[#5b9bd5]" />,
            classNames: {
                ...baseClassNames,
                icon: "text-[#5b9bd5]",
            },
        }),

    warning: (message: string, options?: ToastOptions) =>
        sonnerToast.warning(message, {
            ...options,
            icon: <AlertTriangle size={18} className="text-[#d4a843]" />,
            classNames: {
                ...baseClassNames,
                icon: "text-[#d4a843]",
            },
        }),

    promise: <T,>(
        promise: Promise<T>,
        messages: { loading: string; success: string; error: string }
    ) => sonnerToast.promise(promise, messages),

    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
};
