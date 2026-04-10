import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductionItem } from "@/hooks/useProduction";
import { useProductionItemStatuses } from "@/hooks/useCustomizations";
import { cn } from "@/lib/utils";

/** Board lanes use viewport-based height so each column scrolls vertically (carousel is horizontal only). */
const LANE_MAX_H =
  "max-h-[min(65dvh,36rem)] sm:max-h-[min(70dvh,40rem)] lg:max-h-[calc(100dvh-12.5rem)]";

export function ProductionBoard({
  items,
  onStatusChange,
  onCardClick,
}: {
  items: ProductionItem[];
  onStatusChange: (item: ProductionItem, status: string) => void;
  onCardClick: (item: ProductionItem) => void;
}) {
  const { data: statuses = [] } = useProductionItemStatuses(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRafRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const [canScrollHorizontal, setCanScrollHorizontal] = useState(false);

  const syncScrollAndColumn = useCallback(() => {
    const root = scrollRef.current;
    if (!root || statuses.length === 0) return;
    const sl = root.scrollLeft;
    const max = root.scrollWidth - root.clientWidth;
    const can = max > 1;
    setCanScrollHorizontal((c) => (c === can ? c : can));
    const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((sl / max) * 100)));
    setScrollPct((p) => (p === pct ? p : pct));

    let idx = 0;
    for (let i = 0; i < statuses.length; i++) {
      const el = colRefs.current[i];
      if (!el) continue;
      if (el.offsetLeft <= sl + 12) idx = i;
    }
    setActiveIndex((prev) => (prev === idx ? prev : idx));
  }, [statuses.length]);

  const queueScrollSync = useCallback(() => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncScrollAndColumn();
    });
  }, [syncScrollAndColumn]);

  const statusIds = useMemo(() => statuses.map((s) => s.id).join(","), [statuses]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, statuses.length - 1)));
  }, [statuses.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", queueScrollSync, { passive: true });
    queueScrollSync();
    return () => el.removeEventListener("scroll", queueScrollSync);
  }, [queueScrollSync, statusIds]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => queueScrollSync());
    ro.observe(el);
    queueScrollSync();
    return () => ro.disconnect();
  }, [queueScrollSync, statusIds]);

  const goToColumn = (index: number) => {
    const col = colRefs.current[index];
    if (!col) return;
    col.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  const handleScrubberChange = (value: number[]) => {
    const root = scrollRef.current;
    if (!root) return;
    const max = root.scrollWidth - root.clientWidth;
    if (max <= 0) return;
    root.scrollLeft = (value[0] / 100) * max;
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const itemId = result.draggableId;
    const item = items.find((i) => i.id === itemId);
    if (item && item.status !== newStatus) {
      onStatusChange(item, newStatus);
    }
  };

  const activeStatus = statuses[activeIndex];
  const canPrev = activeIndex > 0;
  const canNext = activeIndex < statuses.length - 1;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex min-h-0 flex-col space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {activeStatus ? (
              <>
                {activeIndex + 1} / {statuses.length} — {activeStatus.display_name}
              </>
            ) : (
              "—"
            )}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 min-h-9 min-w-9 touch-manipulation"
              disabled={!canPrev}
              aria-label="Previous column"
              onClick={() => goToColumn(activeIndex - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 min-h-9 min-w-9 touch-manipulation"
              disabled={!canNext}
              aria-label="Next column"
              onClick={() => goToColumn(activeIndex + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="production-board-hscroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden scroll-smooth px-4 pb-1 touch-pan-x sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {statuses.map((status, colIndex) => {
            const colItems = items.filter((i) => i.status === status.name);
            return (
              <div
                key={status.id}
                ref={(node) => {
                  colRefs.current[colIndex] = node;
                }}
                className={cn(
                  "flex w-[min(92vw,26rem)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/80 bg-card/40 shadow-card backdrop-blur-[2px]",
                  LANE_MAX_H,
                )}
              >
                <div className="shrink-0 border-b border-border/60 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/80"
                      style={{ backgroundColor: status.color }}
                      aria-hidden
                    />
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold"
                      style={{ borderColor: status.color, color: status.color }}
                    >
                      {status.display_name}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{colItems.length}</span>
                  </div>
                </div>

                <Droppable droppableId={status.name}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain px-2 py-2 [-webkit-overflow-scrolling:touch]",
                        snapshot.isDraggingOver && "bg-accent/5",
                      )}
                    >
                      <div className="space-y-2.5 pb-1">
                        {colItems.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <Card
                                  className={cn(
                                    "touch-manipulation cursor-pointer shadow-card transition-all hover:shadow-card-hover active:scale-[0.99]",
                                    dragSnapshot.isDragging && "rotate-1 shadow-lg ring-2 ring-accent",
                                  )}
                                  onClick={() => onCardClick(item)}
                                >
                                  <CardContent className="p-3.5 sm:p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-foreground">{item.trade_types?.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {item.jobs?.customers?.name}
                                        </p>
                                        <p className="font-mono text-[10px] text-muted-foreground">
                                          {item.jobs?.job_id}
                                        </p>
                                      </div>
                                      <div className="shrink-0 text-muted-foreground" aria-hidden>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <circle cx="9" cy="5" r="1" />
                                          <circle cx="9" cy="12" r="1" />
                                          <circle cx="9" cy="19" r="1" />
                                          <circle cx="15" cy="5" r="1" />
                                          <circle cx="15" cy="12" r="1" />
                                          <circle cx="15" cy="19" r="1" />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                      <span className="font-mono">
                                        {item.quantity} {item.unit_type}
                                      </span>
                                      <span className="font-bold text-foreground">
                                        ${(item.labor_cost + item.material_cost).toLocaleString()}
                                      </span>
                                    </div>
                                    {item.scheduled_start_date && (
                                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                                        {item.scheduled_start_date}
                                      </p>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {colItems.length === 0 && (
                          <p className="py-8 text-center text-sm italic text-muted-foreground">Empty</p>
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>

        {canScrollHorizontal && (
          <div className="hidden md:flex md:items-center md:gap-3 md:pt-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <span className="sr-only" id="production-board-scrubber-label">
              Scroll status columns horizontally
            </span>
            <Slider
              aria-labelledby="production-board-scrubber-label"
              value={[scrollPct]}
              max={100}
              step={1}
              onValueChange={handleScrubberChange}
              className="w-full touch-none"
            />
          </div>
        )}

        <div className="flex justify-center gap-2 pb-2 pt-1 md:hidden" role="tablist" aria-label="Status columns">
          {statuses.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`${s.display_name}, ${i + 1} of ${statuses.length}`}
              onClick={() => goToColumn(i)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-colors touch-manipulation",
                i === activeIndex ? "bg-primary" : "bg-muted-foreground/35 hover:bg-muted-foreground/55",
              )}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
}
