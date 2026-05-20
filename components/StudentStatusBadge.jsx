export default function StudentStatusBadge({
  label,
  tone,
  helperText,
  compact = false,
}) {
  return (
    <div className={`statusStack ${compact ? 'compact' : ''}`}>
      <span className={`statusBadge ${tone}`}>{label}</span>
      {helperText && <small>{helperText}</small>}
    </div>
  )
}
