function Skeleton({ className = '', lines = 1, height = 'h-4' }) {
  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`skeleton ${height} ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  return <div className={`skeleton ${height} ${className}`} />;
}

export default Skeleton;
