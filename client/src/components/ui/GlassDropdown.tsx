import { useDismissablePopover } from "@/hooks/ui/useDismissablePopover";
import { ChevronDownIcon } from "@/components/icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface GlassDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GlassDropdown({
  value,
  options,
  onChange,
  placeholder = "Select Option",
}: GlassDropdownProps) {
  const { isOpen, containerRef, toggle, close } = useDismissablePopover();

  const activeLabel =
    options.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className={`w-full bg-zinc-900 border ${
          isOpen
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-zinc-800"
        } text-zinc-300 text-xs rounded-xl pl-3 pr-8 py-2.5 outline-none text-left transition-all shadow-sm flex items-center justify-between`}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDownIcon
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 absolute right-3 ${
            isOpen ? "rotate-0 text-indigo-400" : "rotate-180"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-[#18181b] border border-zinc-700 rounded-xl shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <ul className="py-1 max-h-52 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                    value === opt.value
                      ? "bg-indigo-600/10 text-indigo-400 font-medium"
                      : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
