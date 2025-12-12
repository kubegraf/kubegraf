import { createSignal, Accessor } from 'solid-js';

export interface BulkSelectionItem {
  name: string;
  namespace?: string;
}

export function useBulkSelection<T extends BulkSelectionItem>() {
  const [selectedItems, setSelectedItems] = createSignal<Set<string>>(new Set());

  const getItemKey = (item: T): string => {
    return item.namespace ? `${item.namespace}/${item.name}` : item.name;
  };

  const isSelected = (item: T): boolean => {
    return selectedItems().has(getItemKey(item));
  };

  const toggleSelection = (item: T) => {
    const key = getItemKey(item);
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAll = (items: T[]) => {
    setSelectedItems(new Set(items.map(getItemKey)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedItems = (allItems: T[]): T[] => {
    const selected = selectedItems();
    return allItems.filter((item) => selected.has(getItemKey(item)));
  };

  const selectedCount = (): number => {
    return selectedItems().size;
  };

  return {
    isSelected,
    toggleSelection,
    selectAll,
    deselectAll,
    getSelectedItems,
    selectedCount,
    selectedItems, // Raw Set accessor if needed
  };
}
