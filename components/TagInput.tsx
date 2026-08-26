"use client";

import { useState } from "react";

export default function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <label className="flex flex-col gap-1">
        {label}
        <div className="flex gap-2">
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/20"
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/20"
          >
            Add
          </button>
        </div>
      </label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => removeTag(tag)}
              className="rounded-full border border-black/20 px-3 py-1 dark:border-white/20"
              title="Remove"
            >
              {tag} &times;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
