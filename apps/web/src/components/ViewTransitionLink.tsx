'use client';

import { type ComponentProps, useTransition } from 'react';
import Link from 'next/link';

type ViewTransitionLinkProps = ComponentProps<typeof Link>;

export function ViewTransitionLink({ onClick, ...props }: ViewTransitionLinkProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    const navigate = () => {
      onClick?.(e);
      window.location.href = props.href.toString();
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        startTransition(navigate);
      });
    } else {
      navigate();
    }
  }

  return (
    <Link
      {...props}
      onClick={handleClick}
      aria-busy={isPending}
      style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}
    />
  );
}
