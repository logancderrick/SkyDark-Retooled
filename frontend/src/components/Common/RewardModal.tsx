import { useState, useEffect } from "react";
import Modal from "./Modal";
import type { Reward } from "../../types/rewards";

interface RewardModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (reward: Omit<Reward, "id">) => void;
}

export default function RewardModal({
  open,
  onClose,
  onSave,
}: RewardModalProps) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (open) {
      setName("");
      setPoints(0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), points: Math.max(0, points) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add reward" variant="slideRight">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-skydark-text mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-skydark w-full"
            placeholder="e.g. Ice cream trip"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-skydark-text mb-1.5">Points</label>
          <input
            type="number"
            min={0}
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value, 10) || 0)}
            className="input-skydark w-full"
          />
        </div>
        <button
          type="submit"
          className="btn-primary w-full"
        >
          Add
        </button>
      </form>
    </Modal>
  );
}
