import sophieImg from "@/assets/sophie-avatar.png";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  thinking?: boolean;
  className?: string;
}

export default function SophieAvatar({ size = 28, thinking = false, className }: Props) {
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden bg-primary/20 flex-shrink-0 ring-2 ring-primary/30",
        thinking && "animate-pulse ring-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.5)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={sophieImg}
        alt="Sophie"
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
