import {
  StringInsertEvent,
  StringRemoveEvent
} from "@convergence/convergence";

export interface TextRange {
  start: number;
  end: number;
}

export class SelectionUtils {

  static getRelativeNodeRange(node: Node, container: Node): TextRange {
    const preSelectionRange = document.createRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(node, 0);
    const start = preSelectionRange.toString().length;

    const range = document.createRange();
    range.selectNode(node);
    return {
      start: start,
      end: start + range.toString().length
    };
  }

  static getSelection(containerEl: HTMLElement): TextRange | undefined {
    const selection = window.getSelection();

    // If the windows selection is not below this element
    // then we don't have a seleciton.
    if (!containerEl.contains(selection.anchorNode)) {
      return;
    }

    if (selection.rangeCount > 0) {
      const range = window.getSelection().getRangeAt(0);
      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerEl);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const start = preSelectionRange.toString().length;

      return {
        start: start,
        end: start + range.toString().length
      }
    } else {
      return;
    }
  }

  static setSelection(savedSel: TextRange, containerEl: HTMLElement) {
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);
    const nodeStack = [containerEl];
    let node;
    let foundStart = false;
    let stop = false;

    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType == 3) {
        const nextCharIndex = charIndex + node.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  static transformSelection(selection: TextRange, event): TextRange {
    return {
      start: SelectionUtils.transformIndex(selection.start, event),
      end: SelectionUtils.transformIndex(selection.end, event)
    };
  }

  static transformSelectionOnInsert(selection: TextRange, insertedRange: TextRange): TextRange {
    return {
      start: SelectionUtils.transformIndexOnInsert(selection.start, insertedRange),
      end: SelectionUtils.transformIndexOnInsert(selection.end, insertedRange)
    };
  }

  static transformIndexOnInsert(index: number, insertedRange: TextRange): number {
    if (insertedRange.start <= index) {
      return index + (insertedRange.end - insertedRange.start);
    }
    return index;
  }

  static transformSelectionOnRemove(selection: TextRange, removedRange: TextRange): TextRange {
    return {
      start: SelectionUtils.transformIndexOnRemove(selection.start, removedRange),
      end: SelectionUtils.transformIndexOnRemove(selection.end, removedRange)
    };
  }

  static transformIndexOnRemove(index: number, removedRange: TextRange): number {
    const removeIndex = removedRange.start;
    const length = removedRange.end - removedRange.start;
    if (index > removeIndex) {
      return index - Math.min(index - removeIndex, length);
    }
    return index;
  }

  static transformIndex(index: number, event): number {
    if (event instanceof StringInsertEvent) {
      if (event.index <= index) {
        return index + event.value.length;
      }
      return index;
    } else if (event instanceof StringRemoveEvent) {
      const removeIndex = event.index;
      const length = event.value.length;
      if (index > removeIndex) {
        return index - Math.min(index - removeIndex, length);
      }
      return index;
    }
    throw new Error("Invalid operation type");
  }
}
