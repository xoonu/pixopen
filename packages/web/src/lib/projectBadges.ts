import type { Project } from '@pixopen/core';
import { projectTypeLabel } from '@pixopen/core';

export function projectTypeBadgeClass(type: Project['type']): string {
  switch (type) {
    case 'image-frame':
      return 'badge badge-type-image';
    case 'live-sign':
      return 'badge badge-type-live';
    default:
      return 'badge badge-type-animator';
  }
}

export function projectTypeBadgeLabel(
  type: Project['type'],
  templateName?: string | null,
): string {
  return templateName ?? projectTypeLabel(type);
}
