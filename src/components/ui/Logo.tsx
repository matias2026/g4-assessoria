import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

// Marca G4 (sem o detalhe do haltere) para uso compacto em cabeçalhos —
// extraída do material de marca em public/logo-g4-icon.png.
export function Logo({ className }: LogoProps) {
  return (
    <Image
      src="/logo-g4-icon.png"
      alt="G4"
      width={2887}
      height={1928}
      className={cn("h-8 w-auto", className)}
      priority
    />
  );
}
