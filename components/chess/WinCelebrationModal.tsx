type WinCelebrationModalProps = {
  open: boolean;
  message: string;
  onClose: () => void;
};

export function WinCelebrationModal({ open, message, onClose }: WinCelebrationModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="win-celebration-title"
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#2a211c] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      >
        <p className="text-sm font-semibold tracking-widest text-amber-400 uppercase">
          Victory
        </p>
        <h2
          id="win-celebration-title"
          className="mt-2 text-2xl font-bold tracking-tight text-amber-100"
        >
          Congratulations!
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-amber-100/75">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
