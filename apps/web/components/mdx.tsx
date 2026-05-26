import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

const mdxComponents = {
  h2: ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className={cn(
        'mt-12 scroll-m-24 border-t border-[oklch(0.86_0.008_70)] pt-8 font-medium tracking-normal',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className={cn('mt-8 font-medium tracking-normal', className)} {...props} />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className={cn('leading-7 text-[oklch(0.28_0.012_60)]', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className={cn(
        'my-6 border-l-2 border-[oklch(0.555_0.185_28)] bg-[oklch(0.955_0.006_100)] px-5 py-4 text-[15px] leading-7',
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => (
    <code
      className={cn(
        'rounded-[4px] bg-[oklch(0.955_0.006_100)] px-1.5 py-0.5 font-mono text-[0.9em]',
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className={cn(
        'my-6 overflow-x-auto rounded-[8px] border border-[oklch(0.86_0.008_70)] bg-[oklch(0.18_0.04_278)] p-4 text-[oklch(0.985_0_0)] shadow-sm',
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }: ComponentPropsWithoutRef<'table'>) => (
    <table
      className={cn('my-6 w-full border-separate border-spacing-0 text-sm', className)}
      {...props}
    />
  ),
  img: ({ className, ...props }: ComponentPropsWithoutRef<'img'>) => (
    <ImageZoom
      className={cn('rounded-[8px] border border-[oklch(0.86_0.008_70)]', className)}
      {...props}
    />
  ),
} satisfies MDXComponents;

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...mdxComponents,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
