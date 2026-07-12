import React, { useState } from "react";
import { cn } from "../utils";
import { CheckCircle, Copy, Loader2 } from "lucide-react";

export function Avi({ initials, size = "sm" }) {
  const s = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-base", xl: "w-20 h-20 text-xl" }[size];
  return (
    <div className={cn(s, "rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center flex-shrink-0 select-none")}>
      {initials}
    </div>
  );
}

export function TagBadge({ label, active, onClick, mono = true }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        "px-2 py-0.5 text-xs rounded transition-colors leading-relaxed flex-shrink-0",
        mono && "font-mono",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
    >
      {label.startsWith("#") ? label : `#${label}`}
    </button>
  );
}

export function Btn({
  children, variant = "primary", size = "md", onClick, className = "", disabled, icon, fullWidth, type = "button", loading = false
}) {
  const v = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
    ghost: "text-foreground hover:bg-secondary",
    outline: "border border-border text-foreground hover:bg-secondary",
    danger: "text-destructive hover:bg-destructive/10",
  };
  const s = {
    xs: "px-2.5 py-1 text-xs gap-1.5",
    sm: "px-3 py-1.5 text-sm gap-2",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        v[variant], s[size], fullWidth && "w-full", className
      )}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : icon}
      {children}
    </button>
  );
}

export function Input({
  label, placeholder, type = "text", value, onChange, icon, hint, error, textarea,
}) {
  const base = "w-full bg-input-background text-foreground placeholder:text-muted-foreground rounded px-3 py-2 text-sm border border-transparent focus:outline-none focus:ring-1 focus:ring-ring transition-all";
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        {textarea ? (
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            rows={4}
            className={cn(base, icon && "pl-9", "resize-none")}
          />
        ) : (
          <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(base, icon && "pl-9")}
          />
        )}
      </div>
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function Divider() {
  return <hr className="border-border" />;
}

export function Stat({ label, value, delta }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{value}</span>
      {delta && <span className="text-xs text-emerald-500">{delta}</span>}
    </div>
  );
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <CheckCircle size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function CodeBlock({ code, lang = "bash" }) {
  return (
    <div className="my-6 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary border-b border-border">
        <span className="text-xs font-mono text-muted-foreground">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed bg-[#0D0D12] dark:bg-[#07070A] text-[#C8C8D8]">
        <code style={{ fontFamily: "var(--font-mono)" }}>{code}</code>
      </pre>
    </div>
  );
}
