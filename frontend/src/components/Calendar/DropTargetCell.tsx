import { useRef } from "react";
import { useDrop } from "react-dnd";

import { EVENT_TYPE } from "./DraggableEventCard";

interface DropTargetCellProps {
  date: Date;
  hour: number;
  pixelsPerHour?: number;
  children: React.ReactNode;
}

export default function DropTargetCell({
  date,
  hour,
  pixelsPerHour = 60,
  children,
}: DropTargetCellProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: EVENT_TYPE,
    drop: () => ({
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      hour,
      minute: 0,
    }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drop(ref);

  return (
    <div
      ref={ref}
      className={`absolute left-0 right-0 ${isOver ? "bg-skydark-accent-bg" : ""}`}
      style={{ top: hour * pixelsPerHour, height: pixelsPerHour }}
    >
      {children}
    </div>
  );
}
