"use client";

export type TimeControlOption = "off" | "5+0" | "10+0" | "15+0";

const OPTIONS: { value: TimeControlOption; label: string }[] = [
  { value: "off", label: "No clock" },
  { value: "5+0", label: "5 min" },
  { value: "10+0", label: "10 min" },
  { value: "15+0", label: "15 min" },
];

type TimeControlPickerProps = {
  value: TimeControlOption;
  onChange: (value: TimeControlOption) => void;
};

export function TimeControlPicker({ value, onChange }: TimeControlPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            value === option.value
              ? "bg-amber-600 text-stone-950"
              : "bg-white/10 text-amber-100/80 hover:bg-white/15"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
