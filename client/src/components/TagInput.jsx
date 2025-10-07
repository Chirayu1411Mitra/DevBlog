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
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {value.map((t) => (
          <div key={t} style={{ background: '#2b2b2b', color: '#fff', padding: '4px 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem' }}>{t}</span>
            <button type="button" onClick={() => removeTag(t)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label={`Remove ${t}`}>&times;</button>
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add a tag and press Enter"
        style={{ padding: '8px', width: '100%' }}
      />
    </div>
  );
}
