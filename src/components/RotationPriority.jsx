const labels = {ALTA:'Alta', MEDIA:'Media', BAJA:'Baja'};

export default function RotationPriority({priority}) {
  if (!labels[priority?.level]) return null;
  return <span className="ml-2 inline-flex rounded-md border border-sand-100/15 px-2 py-1 text-xs font-semibold text-warning-400" title={priority.explanation}>
    Prioridad {labels[priority.level]}
  </span>;
}
