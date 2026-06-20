import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "success" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-violet-600/20 text-violet-300",
        variant === "secondary" && "bg-zinc-800 text-zinc-300",
        variant === "success" && "bg-emerald-600/20 text-emerald-300",
        variant === "warning" && "bg-amber-600/20 text-amber-300",
        className
      )}
      {...props}
    />
  );
}
