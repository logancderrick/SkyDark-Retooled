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
        data-compact
        onClick={onToggle}
        className={`h-5 w-5 shrink-0 rounded border-2 border-gray-300 p-0 ${item.completed ? "bg-skydark-checkbox-completed" : "bg-white"}`}
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
        data-compact
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 h-8 w-8 shrink-0 rounded p-0 text-skydark-text-secondary hover:bg-gray-100 hover:text-red-500"
        aria-label="Remove"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </li>
  );
}
