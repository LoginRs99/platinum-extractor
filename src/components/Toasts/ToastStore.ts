import { writable } from "svelte/store";

export interface ToastProps {
    id?: number;
    type?: "info" | "danger" | "success" | "warning";
    dismissable?: boolean;
    timeout?: number | null;
    title: string;
    message: string | null;
    link?: { text: string; href: string };
    onCancel?: () => void;
    progress?: number;
}

export interface Toast extends ToastProps {
    id: number;
    createdAt: number;
}

export const toasts = writable<Toast[]>([]);

export const dismissToast = (id: number) => {
    toasts.update((all) => all.filter((t) => t.id !== id));
};

export const addToast = (toast: ToastProps): number => {
    const id = toast.id || Math.floor(Date.now() + Math.random() * 1000);

    const t: Toast = {
        id,
        type: toast.type || "info",
        dismissable: toast.dismissable !== false,
        timeout: toast.timeout !== undefined ? toast.timeout : 6000,
        title: toast.title,
        message: toast.message,
        link: toast.link || undefined,
        onCancel: toast.onCancel || undefined,
        progress: toast.progress,
        createdAt: Date.now()
    };

    toasts.update((all) => [...all, t]);

    if (t.timeout && t.timeout > 0) {
        setTimeout(() => dismissToast(id), t.timeout);
    }

    return id;
};

export const updateToast = (id: number, properties: Partial<ToastProps>) => {
    toasts.update((all) =>
        all.map((t) => (t.id === id ? { ...t, ...properties } : t))
    );
};