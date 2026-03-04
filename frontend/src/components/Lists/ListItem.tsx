import type { ListItemData } from "./ListCard";
import CloseIcon from "../Common/CloseIcon";

interface ListItemProps {
  item: ListItemData;
  onToggle: () => void;
  onDelete: () => void;
}

export default function ListItem({ item, onToggle, onDelete }: ListItemProps) {
  return (
    <li className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={onToggle}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 flex items-center justify-center ${item.completed ? "bg-skydark-checkbox-completed" : "bg-white"}`}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed && <span className="text-white text-xs font-bold">✓</span>}
      </button>
      <span
        className={`flex-1 text-sm text-skydark-text truncate ${
          item.completed ? "line-through text-skydark-text-secondary" : ""
        }`}
      >
        {item.content}
      </span>
      <button
        type="button"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1 text-skydark-text-secondary hover:text-red-500 text-sm"
        aria-label="Remove"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </li>
  );
}
