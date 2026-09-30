function IconField({ icon, type = 'text', placeholder, value, onChange, min }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3 transition-colors focus-within:border-black">
      <i className={`fa-solid ${icon} text-muted`}></i>
      <input
        type={type}
        min={min}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-accent outline-none placeholder:text-muted"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export default IconField
