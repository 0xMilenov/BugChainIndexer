"use client";

import { forwardRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "secondary", size = "md", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-ring disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary:
        "bg-accent text-bg-primary hover:bg-accent-dim border border-accent/30",
      secondary:
        "bg-bg-secondary text-text-primary border border-border hover:bg-bg-tertiary",
      ghost: "text-text-muted hover:bg-bg-tertiary hover:text-text-primary",
    };
    const sizes = {
      sm: "px-2 py-1 text-sm",
      md: "px-3 py-3 text-sm",
    };
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
