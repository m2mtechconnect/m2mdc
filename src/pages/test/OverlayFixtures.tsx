/**
 * Playwright-only fixture route that mounts one of each portal-based
 * Radix overlay so the focus-ring regression suite has a stable, self-
 * contained surface to exercise. Rendered in both public (unauth) and
 * protected route trees so it works with or without a mocked session.
 *
 * DO NOT link to this route from production UI — it exists solely to
 * host synthetic triggers for accessibility tests.
 */
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

export default function OverlayFixtures() {
  return (
    <TooltipProvider delayDuration={0}>
      <main className="min-h-dvh bg-background p-8">
        <h1 className="mb-6 text-lg font-semibold">Overlay focus-ring fixtures</h1>

        <div className="flex flex-wrap items-start gap-6" data-testid="overlay-fixtures">
          <Popover>
            <PopoverTrigger asChild>
              <Button data-testid="popover-trigger">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent data-testid="popover-content" className="w-64">
              <div className="flex flex-col gap-2">
                <input
                  data-testid="popover-input"
                  aria-label="Popover text field"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button data-testid="popover-action">Popover Action</Button>
                <a href="#popover" data-testid="popover-link">
                  Popover link
                </a>
              </div>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button data-testid="tooltip-trigger">Show Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent data-testid="tooltip-content">
              Tooltip body text
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button data-testid="dropdown-trigger">Open Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent data-testid="dropdown-content">
              <DropdownMenuItem data-testid="dropdown-item-1">
                First action
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="dropdown-item-2">
                Second action
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="dropdown-item-3">
                Third action
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <HoverCard openDelay={0} closeDelay={0}>
            <HoverCardTrigger asChild>
              <Button data-testid="hovercard-trigger">Reveal HoverCard</Button>
            </HoverCardTrigger>
            <HoverCardContent data-testid="hovercard-content" className="w-64">
              <div className="flex flex-col gap-2">
                <a href="#hovercard" data-testid="hovercard-link">
                  Hover card link
                </a>
                <Button data-testid="hovercard-action" size="sm">
                  Hover card action
                </Button>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </main>
    </TooltipProvider>
  );
}