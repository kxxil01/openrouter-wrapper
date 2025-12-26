import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';

export function useFolders() {
  const [folders, setFolders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getFolders();
      setFolders(data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const createFolder = useCallback(async (name, color) => {
    try {
      const folder = await api.createFolder(name, color);
      setFolders((prev) => [...prev, folder]);
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }, []);

  const updateFolder = useCallback(async (id, updates) => {
    try {
      const folder = await api.updateFolder(id, updates);
      setFolders((prev) => prev.map((f) => (f.id === id ? folder : f)));
      return folder;
    } catch (error) {
      console.error('Error updating folder:', error);
      throw error;
    }
  }, []);

  const deleteFolder = useCallback(async (id) => {
    try {
      await api.deleteFolder(id);
      setFolders((prev) => prev.filter((f) => f.id !== id));
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  }, []);

  return {
    folders,
    isLoading,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
}
