import * as React from "react";

import { cn } from "@/lib/utils";

type TooltipProviderProps = React.HTMLAttributes<HTMLDivElement> & {
  delayDuration?: number;
};

const TooltipProvider = ({ children }: TooltipProviderProps) => <>{children}</>;

const Tooltip = ({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("group/tooltip relative inline-flex", className)} {...props}>
    {children}
  </span>
);

type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
};

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(({ asChild, children, className, ...props }, ref) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ...props,
      ref,
      className: cn((children.props as { className?: string }).className, className),
    });
  }

  return (
    <span ref={ref as React.Ref<HTMLSpanElement>} className={className} {...props}>
      {children}
    </span>
  );
});
TooltipTrigger.displayName = "TooltipTrigger";

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
};

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", hidden, ...props }, ref) => (
    <div
      ref={ref}
      role="tooltip"
      hidden={hidden}
      className={cn(
        "pointer-events-none absolute z-50 min-w-max overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
        sideClasses[side],
        className,
      )}
      {...props}
    />
  ),
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
