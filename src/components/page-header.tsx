export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl tracking-wide">{title}</h1>
      {description && <p className="mt-1 text-muted">{description}</p>}
    </div>
  );
}
