import { useRef } from "react";
import { useDrop } from "react-dnd";
import { MEAL_RECIPE_TYPE } from "./DraggableMealCard";
import type { MealRecipe } from "../../types/meals";

export interface DropResult {
  date: string;
  mealType: string;
}

interface DropTargetMealCellProps {
  date: string;
  mealType: string;
  onDrop: (recipe: MealRecipe, date: string, mealType: string) => void;
  children: React.ReactNode;
}

export default function DropTargetMealCell({
  date,
  mealType,
  onDrop,
  children,
}: DropTargetMealCellProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isOver }, drop] = useDrop({
    accept: MEAL_RECIPE_TYPE,
    drop: (item: { recipe: MealRecipe }) => {
      onDrop(item.recipe, date, mealType);
      return { date, mealType } as DropResult;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drop(ref);

  return (
    <div
      ref={ref}
      className={`h-full min-h-[60px] ${isOver ? "bg-skydark-accent-bg rounded-card" : ""}`}
    >
      {children}
    </div>
  );
}
