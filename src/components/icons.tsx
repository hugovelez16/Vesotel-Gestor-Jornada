
import { cn } from "@/lib/utils";

export function VesotelLogo({ className }: { className?: string }) {
  return (
    <div className={cn("inline-flex items-center justify-center", className)}>
      <img
        src="/logo.webp"
        alt="Vesotel Logo"
        className="h-8 w-auto"
      />
      <span className="ml-2 text-lg font-bold text-foreground">Vesotel</span>
    </div>
  );
}
