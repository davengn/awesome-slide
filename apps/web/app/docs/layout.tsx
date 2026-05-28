import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  return (
    <div className="as-docs-shell min-h-dvh bg-white text-black">
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
      </DocsLayout>
    </div>
  );
}
