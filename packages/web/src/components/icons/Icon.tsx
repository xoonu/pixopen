import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps } from 'react';
import type { IconSvgElement } from '@hugeicons/react';

export type IconProps = Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'> & {
  icon: IconSvgElement;
};

/** Renders an icon from the [Huge Icons](https://icon-sets.iconify.design/hugeicons/) set. */
export function Icon({
  icon,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.75,
  ...props
}: IconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      aria-hidden={props['aria-label'] ? undefined : true}
      {...props}
    />
  );
}

export type { IconSvgElement };
