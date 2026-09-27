type ChoiceGroupProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  required?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  required,
  allowEmpty,
  emptyLabel = "全部",
}: ChoiceGroupProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-neutral-800">
        {label}
        {required ? " *" : ""}
      </legend>
      <div className="flex flex-wrap gap-2">
        {allowEmpty && (
          <button
            type="button"
            className={value === "" ? "btn-primary px-3 py-1.5 text-sm" : "btn-ghost px-3 py-1.5 text-sm"}
            onClick={() => onChange("")}
          >
            {emptyLabel}
          </button>
        )}
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? "btn-primary px-3 py-1.5 text-sm" : "btn-ghost px-3 py-1.5 text-sm"}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
