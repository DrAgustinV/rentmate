import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { setupOptimisticUpdate, rollbackOptimisticUpdate } from './optimisticHelpers';

describe('optimisticHelpers', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  describe('setupOptimisticUpdate', () => {
    it('should return previous data and set new data', async () => {
      const queryKey = ['test', 'items'];
      const initialData = [{ id: '1', name: 'Original' }];

      queryClient.setQueryData(queryKey, initialData);

      const result = await setupOptimisticUpdate(
        queryClient,
        queryKey,
        (old) => [...(old || []), { id: '2', name: 'New' }]
      );

      expect(result.previousData).toEqual(initialData);
      expect(queryClient.getQueryData(queryKey)).toEqual([
        { id: '1', name: 'Original' },
        { id: '2', name: 'New' },
      ]);
    });

    it('should handle undefined previous data', async () => {
      const queryKey = ['test', 'items'];

      const result = await setupOptimisticUpdate(
        queryClient,
        queryKey,
        (old) => old || []
      );

      expect(result.previousData).toBeUndefined();
      expect(queryClient.getQueryData(queryKey)).toEqual([]);
    });

    it('should use updater function correctly', async () => {
      const queryKey = ['test', 'counter'];
      queryClient.setQueryData(queryKey, { count: 5 });

      const result = await setupOptimisticUpdate(
        queryClient,
        queryKey,
        (old) => ({ count: (old as { count: number })?.count + 1 || 0 })
      );

      expect(result.previousData).toEqual({ count: 5 });
      expect(queryClient.getQueryData(queryKey)).toEqual({ count: 6 });
    });

    it('should replace data with updater result', async () => {
      const queryKey = ['test', 'data'];
      queryClient.setQueryData(queryKey, { items: ['a', 'b', 'c'] });

      const result = await setupOptimisticUpdate(
        queryClient,
        queryKey,
        () => ({ items: ['x', 'y', 'z'] })
      );

      expect(result.previousData).toEqual({ items: ['a', 'b', 'c'] });
      expect(queryClient.getQueryData(queryKey)).toEqual({ items: ['x', 'y', 'z'] });
    });

    it('should work with array query data', async () => {
      const queryKey = ['users'];
      queryClient.setQueryData(queryKey, ['user1', 'user2']);

      const result = await setupOptimisticUpdate(
        queryClient,
        queryKey,
        (old) => [...(old as string[]), 'user3']
      );

      expect(result.previousData).toEqual(['user1', 'user2']);
      expect(queryClient.getQueryData(queryKey)).toEqual(['user1', 'user2', 'user3']);
    });

    it('should cancel any in-flight queries for the key', async () => {
      const queryKey = ['test', 'cancel'];
      const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');

      await setupOptimisticUpdate(
        queryClient,
        queryKey,
        (old) => old
      );

      expect(cancelSpy).toHaveBeenCalledWith({ queryKey });
    });
  });

  describe('rollbackOptimisticUpdate', () => {
    it('should restore previous data when context exists', () => {
      const queryKey = ['test', 'rollback'];
      const previousData = { value: 'restored' };
      queryClient.setQueryData(queryKey, { value: 'current' });

      const context = { previousData };

      rollbackOptimisticUpdate(queryClient, queryKey, context);

      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'restored' });
    });

    it('should do nothing when context is undefined', () => {
      const queryKey = ['test', 'noop'];
      queryClient.setQueryData(queryKey, { value: 'unchanged' });

      rollbackOptimisticUpdate(queryClient, queryKey, undefined);

      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'unchanged' });
    });

    it('should do nothing when previousData is undefined', () => {
      const queryKey = ['test', 'noop2'];
      queryClient.setQueryData(queryKey, { value: 'current' });

      const context = { previousData: undefined as { value: string } | undefined };

      rollbackOptimisticUpdate(queryClient, queryKey, context);

      expect(queryClient.getQueryData(queryKey)).toEqual({ value: 'current' });
    });

    it('should restore array data correctly', () => {
      const queryKey = ['items'];
      const previousData = ['item1', 'item2'];
      queryClient.setQueryData(queryKey, ['item1', 'item2', 'item3', 'item4']);

      const context = { previousData };

      rollbackOptimisticUpdate(queryClient, queryKey, context);

      expect(queryClient.getQueryData(queryKey)).toEqual(['item1', 'item2']);
    });

    it('should work with nested query keys', () => {
      const queryKey = ['entity', 'type', 'items'];
      const previousData = { items: [{ id: '1' }] };
      queryClient.setQueryData(queryKey, { items: [{ id: '2' }] });

      const context = { previousData };

      rollbackOptimisticUpdate(queryClient, queryKey, context);

      expect(queryClient.getQueryData(queryKey)).toEqual({ items: [{ id: '1' }] });
    });
  });
});