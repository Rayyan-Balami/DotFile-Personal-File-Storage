import { Children, ReactElement, cloneElement } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ButtonGroupProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactElement[];
}

export const ButtonGroup = ({
  className,
  orientation = 'horizontal',
  children,
}: ButtonGroupProps) => {
  const totalButtons = Children.count(children);
  const isHorizontal = orientation === 'horizontal';
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'flex',
        {
          'flex-col': isVertical,
          'w-fit': isVertical,
        },
        className
      )}
    >
      {Children.map(children, (child, index) => {
        const isFirst = index === 0;
        const isLast = index === totalButtons - 1;

        // Find the Button component in the child's props
        const buttonProps = {
          className: cn(
            {
              'rounded-l-none': isHorizontal && !isFirst,
              'rounded-r-none': isHorizontal && !isLast,
              'border-l-0': isHorizontal && !isFirst,

              'rounded-t-none': isVertical && !isFirst,
              'rounded-b-none': isVertical && !isLast,
              'border-t-0': isVertical && !isFirst,
            },
            (child as ReactElement<{ className?: string }>).props.className
          ),
        };

        // If the child is a Button, apply the props directly
        if (child.type === Button) {
          return cloneElement(child, buttonProps);
        }

        // If the child is a component that contains a Button, clone it and pass the props
        return cloneElement(child, {
          ...(child as ReactElement<{ className?: string }>).props,
          ...buttonProps,
        });
      })}
    </div>
  );
};