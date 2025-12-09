import { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

interface AccordionSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  variant?: "default" | "card";
  badge?: ReactNode;
}

export function AccordionSection({
  title,
  subtitle,
  children,
  defaultCollapsed = true,
  variant = "default",
  badge,
}: AccordionSectionProps) {
  const content = (
    <Accordion type="single" collapsible defaultValue={defaultCollapsed ? undefined : "item-1"}>
      <AccordionItem value="item-1" className="border-none">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 text-left">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{title}</h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-4">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  if (variant === "card") {
    return <Card className="p-4">{content}</Card>;
  }

  return content;
}
