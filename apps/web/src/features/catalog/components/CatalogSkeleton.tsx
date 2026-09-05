export function CatalogSkeleton() {
  return (
    <div className="project-grid" aria-hidden="true">
      {Array.from({ length: 8 }, (_, index) => (
        <div className="project-card skeleton-card" key={index}>
          <div className="skeleton skeleton-cover" />
          <div className="skeleton-card-body">
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-line" />
            <span className="skeleton skeleton-line short" />
            <span className="skeleton skeleton-price" />
          </div>
        </div>
      ))}
    </div>
  );
}
