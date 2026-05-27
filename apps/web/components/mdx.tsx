import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

const mdxComponents = {
  h2: ({ className, ...props }: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className={cn(
        'mt-12 scroll-m-24 border-t border-[#e6e6e6] pt-8 font-medium tracking-normal',
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentPropsWithoutRef<'h3'>) => (
    <h3 className={cn('mt-8 font-medium tracking-normal', className)} {...props} />
  ),
  p: ({ className, ...props }: ComponentPropsWithoutRef<'p'>) => (
    <p className={cn('leading-7 text-black', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className={cn(
        'my-6 border-l-2 border-black bg-[#f7f7f5] px-5 py-4 text-[15px] leading-7',
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentPropsWithoutRef<'code'>) => (
    <code
      className={cn('rounded-[4px] bg-[#f7f7f5] px-1.5 py-0.5 font-mono text-[0.9em]', className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className={cn(
        'my-6 overflow-x-auto rounded-[8px] border border-[#e6e6e6] bg-black p-4 text-white shadow-sm',
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
  img: ({ alt = '', className, src, ...props }: ComponentPropsWithoutRef<'img'>) => (
    <ImageZoom
      alt={alt}
      className={cn('rounded-[8px] border border-[#e6e6e6]', className)}
      src={typeof src === 'string' ? src : ''}
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
