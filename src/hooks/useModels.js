import { useState, useEffect, useCallback } from 'react';
import { getModels, getPreferences, updatePreferences } from '../lib/api';
import { DEFAULT_MODELS } from '../constants';

export function useModels() {
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODELS[0]);
  const [isLoading, setIsLoading] = useState(true);

  const selectModel = useCallback(async (model) => {
    setSelectedModel(model);
    try {
      await updatePreferences({ default_model_id: model.id });
    } catch (err) {
      console.error('Error saving model preference:', err);
    }
  }, []);

  useEffect(() => {
    async function fetchModels() {
      try {
        setIsLoading(true);
        const [fetchedModels, preferences] = await Promise.all([getModels(), getPreferences()]);

        if (fetchedModels && fetchedModels.length > 0) {
          setModels(fetchedModels);
          if (preferences?.default_model_id) {
            const savedModel = fetchedModels.find((m) => m.id === preferences.default_model_id);
            if (savedModel) {
              setSelectedModel(savedModel);
              return;
            }
          }
          setSelectedModel(fetchedModels[0]);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchModels();
  }, []);

  return {
    models,
    selectedModel,
    setSelectedModel: selectModel,
    isLoading,
  };
}
