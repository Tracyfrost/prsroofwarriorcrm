import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { ProductionItem } from "@/hooks/useProduction";
import { useProductionItemStatuses, type ProductionItemStatus } from "@/hooks/useCustomizations";

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const itemId = result.draggableId;
    const item = items.find((i) => i.id === itemId);
    if (item && item.status !== newStatus) {
      onStatusChange(item, newStatus);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => {
          const colItems = items.filter((i) => i.status === status.name);
          return (
            <Droppable droppableId={status.name} key={status.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-w-[240px] flex-1 rounded-lg p-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-accent/10" : ""
                  }`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold"
                      style={{ borderColor: status.color, color: status.color }}
                    >
                      {status.display_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{colItems.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {colItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <Card
                              className={`cursor-pointer shadow-card hover:shadow-card-hover transition-shadow ${
                                dragSnapshot.isDragging ? "ring-2 ring-accent shadow-lg rotate-1" : ""
                              }`}
                              onClick={() => onCardClick(item)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-foreground">{item.trade_types?.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {item.jobs?.customers?.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-muted-foreground">
                                      {item.jobs?.job_id}
                                    </p>
                                  </div>
                                  <div className="text-muted-foreground ml-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                                      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                                    </svg>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span className="font-mono">
                                    {item.quantity} {item.unit_type}
                                  </span>
                                  <span className="font-bold text-foreground">
                                    ${(item.labor_cost + item.material_cost).toLocaleString()}
                                  </span>
                                </div>
                                {item.scheduled_start_date && (
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    📅 {item.scheduled_start_date}
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
                      <p className="text-xs text-muted-foreground text-center py-6">Empty</p>
                    )}
                  </div>
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
