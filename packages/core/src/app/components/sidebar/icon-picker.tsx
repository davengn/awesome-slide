import EmojiPicker, { EmojiStyle, Theme } from 'emoji-picker-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FolderIcon } from '@/lib/sdk';
import { useLocale } from '@/lib/use-locale';

export const PRESET_COLORS = [
  '#000000',
  '#dceeb1',
  '#c5b0f4',
  '#f4ecd6',
  '#c8e6cd',
  '#efd4d4',
  '#f3c9b6',
  '#1f1d3d',
];

export function IconPicker({
  value,
  onChange,
}: {
  value: FolderIcon;
  onChange: (icon: FolderIcon) => void;
}) {
  const t = useLocale();
  return (
    <Tabs defaultValue={value.type} className="w-[320px]">
      <TabsList className="w-full">
        <TabsTrigger value="emoji">{t.home.iconEmojiTab}</TabsTrigger>
        <TabsTrigger value="color">{t.home.iconColorTab}</TabsTrigger>
      </TabsList>

      <TabsContent value="emoji">
        <EmojiPicker
          lazyLoadEmojis
          emojiStyle={EmojiStyle.NATIVE}
          theme={Theme.AUTO}
          width="100%"
          height={360}
          onEmojiClick={(data) => onChange({ type: 'emoji', value: data.emoji })}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
        />
      </TabsContent>

      <TabsContent value="color">
        <div className="grid grid-cols-8 gap-1.5 py-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ type: 'color', value: c })}
              aria-pressed={value.type === 'color' && value.value === c}
              className="size-7 rounded-[4px] ring-1 ring-foreground/10 shadow-[inset_0_1px_0_oklch(1_0_0/0.18)] transition-transform hover:scale-105 aria-pressed:ring-2 aria-pressed:ring-foreground"
              style={{ background: c }}
              aria-label={`Use folder color ${c}`}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
