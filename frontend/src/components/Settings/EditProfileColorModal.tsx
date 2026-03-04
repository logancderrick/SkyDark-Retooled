import Modal from "../Common/Modal";

/** Same 25-color palette as AddProfileModal (5x5 grid). */
const PROFILE_COLORS = [
  "#1E3A5F",
  "#3B82A3",
  "#7DD3FC",
  "#BAE1FF",
  "#67E8D2",
  "#C4B5FD",
  "#A78BFA",
  "#34D399",
  "#059669",
  "#A3E635",
  "#991B1B",
  "#F87171",
  "#FDA4AF",
  "#FB923C",
  "#F97316",
  "#D4A574",
  "#E0D4C5",
  "#FEF3C7",
  "#F59E0B",
  "#92400E",
];

interface EditProfileColorModalProps {
  open: boolean;
  member: { id: string; name: string; color: string } | null;
  onClose: () => void;
  onSelectColor: (color: string) => void;
}

export default function EditProfileColorModal({
  open,
  member,
  onClose,
  onSelectColor,
}: EditProfileColorModalProps) {
  if (!member) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit color — ${member.name}`} variant="slideRight">
      <div>
        <p className="text-sm text-skydark-text-secondary mb-4">Choose a color for {member.name}.</p>
        <div className="grid grid-cols-5 gap-3">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelectColor(c)}
              className="aspect-square w-full max-w-[56px] rounded-full border-2 border-white shadow-sm transition-transform hover:scale-105 mx-auto"
              style={{
                backgroundColor: c,
                boxShadow: member.color === c ? "0 0 0 2px white, 0 0 0 4px #2B3A4A" : undefined,
              }}
              aria-label={`Color ${c}`}
              aria-pressed={member.color === c}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
