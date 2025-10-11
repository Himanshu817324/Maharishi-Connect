import React, { memo, useCallback } from 'react';
import { FlatList, FlatListProps, ListRenderItem } from 'react-native';

interface PerformanceFlatListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  getItemLayout?: (data: T[] | null | undefined, index: number) => { length: number; offset: number; index: number };
}

const PerformanceFlatList = memo(<T,>({
  data,
  renderItem,
  keyExtractor,
  getItemLayout,
  ...props
}: PerformanceFlatListProps<T>) => {
  const memoizedRenderItem = useCallback(renderItem, [renderItem]);
  const memoizedKeyExtractor = useCallback(keyExtractor, [keyExtractor]);

  return (
    <FlatList
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
}) as <T>(props: PerformanceFlatListProps<T>) => JSX.Element;

export default PerformanceFlatList;
