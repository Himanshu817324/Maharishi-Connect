import React, { memo, useCallback, forwardRef } from 'react';
import { FlatList, FlatListProps, ListRenderItem } from 'react-native';

interface PerformanceFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  getItemLayout?: (data: T[] | null | undefined, index: number) => { length: number; offset: number; index: number };
}

const PerformanceFlatList = memo(forwardRef<FlatList<any>, PerformanceFlatListProps<any>>(({
  data,
  renderItem,
  keyExtractor,
  getItemLayout,
  ...props
}, ref) => {
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);
  const memoizedKeyExtractor = useCallback(keyExtractor, [keyExtractor]);

  return (
    <FlatList
      ref={ref}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={20}
      windowSize={10}
      {...props}
    />
  );
}));

PerformanceFlatList.displayName = 'PerformanceFlatList';

export default PerformanceFlatList;
