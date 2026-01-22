import { TreeCursor } from '@lezer/common'

export function dumpTree(
  cursor: TreeCursor,
  doc: string,
  indent = 0
) {
  do {
    console.log(
      " ".repeat(indent) +
      cursor.name +
      " → `" +
      doc.slice(cursor.from, cursor.to) +
      "`"
    );

    if (cursor.firstChild()) {
      dumpTree(cursor, doc, indent + 2);
      cursor.parent();
    }
  } while (cursor.nextSibling());
}
