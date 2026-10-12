import { useState, type CSSProperties } from 'react';

/** Повреждённый/недоступный ресурс оставляет осмысленную подпись вместо broken image. */
export function TrainingArtImage({ src, label, className = '', style }: { src: string | null; label: string; className?: string; style?: CSSProperties }) {
  const [failed, setFailed] = useState<string | null>(null);
  return src && failed !== src
    ? <img src={src} alt="" className={className} style={style} draggable={false} onError={() => setFailed(src)} />
    : <span className={`training-art-fallback ${className}`} style={style}>{label}</span>;
}
