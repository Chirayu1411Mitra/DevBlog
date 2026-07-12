import React, { useState } from 'react';

export default function TagInput({ value = [], onChange }) {
  const [input, setInput] = useState('');

  const addTag = (raw) => {
    const t = String(raw || '').trim();
    if (!t) return;
    if (value.includes(t)) return;
    const next = [...value, t];
    onChange && onChange(next);
    setInput('');
  };

  const removeTag = (tag) => {
    const next = value.filter((t) => t !== tag);
    onChange && onChange(next);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && input === '') {
      // remove last
      if (value.length) {
        const next = value.slice(0, -1);
        onChange && onChange(next);
      }
    }
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-2">
        {value.map((t) => (
          <div key={t} className="bg-surface text-white px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-xs">{t}</span>
            <button type="button" onClick={() => removeTag(t)} className="bg-transparent border-none text-white hover:text-white/75 cursor-pointer p-0" aria-label={`Remove ${t}`}>&times;</button>
          </div>
        ))}
      </div>
      <input
        className="w-full px-3 py-2"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add a tag and press Enter"
      />
    </div>
  );
}
