import { Range } from 'slate'; // ✅ make sure this is at the top
import React, { useMemo, useState } from 'react';
import {
  createEditor,
  Descendant,
  Editor,
  Element as SlateElement,
  Node,
  Transforms,
  BaseEditor,
  Text
} from 'slate';
import { Slate, Editable, withReact, ReactEditor, useSlate } from 'slate-react';

// Extend Slate types
type CustomElement =
  | { type: 'paragraph'; children: CustomText[] }
  | { type: 'code'; children: CustomText[] };

type CustomText = { text: string; bold?: boolean; italic?: boolean; code?: boolean };

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

const isTextNode = (node: Node): node is Text => Text.isText(node);

const toggleMark = (editor: Editor, format: keyof Omit<CustomText, 'text'>) => {
  const isActive = isMarkActive(editor, format);
  const { selection } = editor;

  if (selection && !Range.isCollapsed(selection)) {
    Transforms.setNodes(
      editor,
      { [format]: isActive ? undefined : true },
      {
        match: node => isTextNode(node),
        split: true,
      }
    );
  } else {
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  }
};

const isMarkActive = (editor: Editor, format: keyof Omit<CustomText, 'text'>) => {
  const marks = Editor.marks(editor);
  return marks ? (marks as any)[format] === true : false;
};

const toggleCodeBlock = (editor: Editor) => {
  const isActive = isBlockActive(editor, 'code');
  Transforms.setNodes(
    editor,
    { type: isActive ? 'paragraph' : 'code' } as Partial<CustomElement>,
    {
      match: n => !Editor.isEditor(n) && SlateElement.isElement(n),
    }
  );
};

const isBlockActive = (editor: Editor, format: string) => {
  const [match] = Editor.nodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  });
  return !!match;
};

// Warm light grayscale UI tokens (match app theme)
const ui = {
  bgPanel: 'rgba(255,255,255,0.65)',
  inputBg: 'rgba(255,255,255,0.75)',
  border: 'rgba(154,156,148,0.45)',
  borderSoft: 'rgba(154,156,148,0.28)',
  inkHigh: '#353535',
  inkMid: '#5c5e58',
  inkLow: '#8d8f88',
  white: '#ffffff',
};

const Element = ({ attributes, children, element }: any) => {
  switch (element.type) {
    case 'code':
      return (
        <pre
          {...attributes}
          style={{
            color: ui.white,
            backgroundColor: 'rgba(0,0,0,0.85)',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: 13,
            padding: '12px',
            borderRadius: 6,
            overflowX: 'auto',
            border: `1px solid ${ui.border}`,
            margin: '8px 0',
          }}
        >
          <code>{children}</code>
        </pre>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.code) children = <code>{children}</code>;
  return <span {...attributes}>{children}</span>;
};

const escapeMarkdown = (text: string): string =>
  text.replace(/([\`\*\_\[\]\(\)\>\#\+\\\-\!])/g, '\\$1');

const serialize = (nodes: Descendant[]): string => {
  return nodes
    .map((n) => {
      if (SlateElement.isElement(n) && n.type === 'code') {
        const codeText = Node.string(n);
        return `\`\`\`\n${codeText}\n\`\`\``;
      }

      if (SlateElement.isElement(n) && n.type === 'paragraph') {
        return n.children
          .map((leaf: CustomText) => {
            let text = escapeMarkdown(leaf.text);

            if (leaf.bold && leaf.italic) {
              text = `***${text}***`;
            } else if (leaf.bold) {
              text = `**${text}**`;
            } else if (leaf.italic) {
              text = `*${text}*`;
            }

            if (leaf.code) {
              text = `\`${text}\``;
            }

            return text;
          })
          .join('');
      }

      return '';
    })
    .join('\n\n');
};

const FormatButton = ({ format, icon }: { format: keyof Omit<CustomText, 'text'>; icon: string }) => {
  const editor = useSlate();
  const active = isMarkActive(editor, format);
  return (
    <button
      onMouseDown={e => {
        e.preventDefault();
        toggleMark(editor, format);
      }}
      style={{
        fontWeight: 500,
        marginRight: 8,
        padding: '6px 10px',
        cursor: 'pointer',
        background: active ? 'rgba(0,0,0,0.1)' : 'transparent',
        border: `1px solid ${active ? ui.border : ui.borderSoft}`,
        borderRadius: 4,
        color: active ? ui.inkHigh : ui.inkMid,
        fontSize: 13,
        transition: 'all 0.15s ease',
      }}
      type="button"
      aria-label={`Toggle ${format}`}
    >
      {icon}
    </button>
  );
};

const CodeBlockButton = () => {
  const editor = useSlate();
  const active = isBlockActive(editor, 'code');
  return (
    <button
      onMouseDown={e => {
        e.preventDefault();
        toggleCodeBlock(editor);
      }}
      style={{
        fontWeight: 500,
        padding: '6px 10px',
        cursor: 'pointer',
        background: active ? 'rgba(0,0,0,0.1)' : 'transparent',
        border: `1px solid ${active ? ui.border : ui.borderSoft}`,
        borderRadius: 4,
        color: active ? ui.inkHigh : ui.inkMid,
        fontSize: 13,
        transition: 'all 0.15s ease',
      }}
      type="button"
      aria-label="Toggle code block"
    >
      {'{ }'}
    </button>
  );
};

interface ChatInputProps {
  onSend: (message: string) => Promise<void> | void;
  loading?: boolean;
  error?: string | null;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend }) => {
  const editor = useMemo(() => withReact(createEditor()), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ]);

  const handleSend = () => {
    const message = serialize(value).trim();
    if (message.length === 0) return;
    onSend(message);

    // Clear content
    Transforms.delete(editor, {
      at: {
        anchor: Editor.start(editor, []),
        focus: Editor.end(editor, []),
      },
    });

    // Insert empty paragraph
    Transforms.insertNodes(editor, {
      type: 'paragraph',
      children: [{ text: '' }],
    });

    // Collapse selection to start
    Transforms.select(editor, Editor.start(editor, []));
    ReactEditor.focus(editor);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case 'b':
          event.preventDefault();
          toggleMark(editor, 'bold');
          break;
        case 'i':
          event.preventDefault();
          toggleMark(editor, 'italic');
          break;
        case 'q':
          event.preventDefault();
          toggleCodeBlock(editor);
          break;
        case 'Enter':
          event.preventDefault();
          handleSend();
          break;
      }
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      const [match] = Editor.nodes(editor, {
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'code',
      });

      if (!match) {
        event.preventDefault();
        handleSend();
      }
    }
  };

  return (
    <div
      style={{
        border: `1px solid ${ui.border}`,
        borderRadius: 8,
        padding: 12,
        minWidth: 300,
        maxWidth: 1200,
        display: 'flex',
        flexDirection: 'column',
        background: ui.bgPanel,
        backdropFilter: 'blur(12px)',
      }}
    >
      <Slate editor={editor} initialValue={value} onValueChange={newValue => setValue(newValue)}>
        <div style={{ marginBottom: 8 }}>
          <FormatButton format="bold" icon="B" />
          <FormatButton format="italic" icon="I" />
          <CodeBlockButton />
        </div>
        <Editable
          renderElement={Element}
          renderLeaf={Leaf}
          placeholder="Type your message..."
          spellCheck
          autoFocus
          onKeyDown={onKeyDown}
          style={{
            minHeight: 70,
            maxHeight: 150,
            overflowY: 'auto',
            padding: 12,
            fontSize: 14,
            lineHeight: '1.45',
            background: ui.inputBg,
            border: `1px solid ${ui.border}`,
            borderRadius: 6,
            color: ui.inkHigh,
            outline: 'none',
          }}
        />
      </Slate>
      <button
        title="Send message"
        type="button"
        onClick={handleSend}
        // disabled={serialize(value).trim().length === 0}
        style={{
          marginTop: 12,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: '500',
          background: ui.white,
          border: `1px solid ${ui.border}`,
          borderRadius: 6,
          color: ui.inkHigh,
          cursor: 'pointer',
          alignSelf: 'flex-end',
          transition: 'all 0.15s ease',
        }}
      >
        Send
      </button>
    </div>
  );
};

export default ChatInput;
