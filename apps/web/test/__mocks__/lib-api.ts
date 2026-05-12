export async function getApiClient() {
  return {
    learning: {
      listPaths: async () => [],
      getPath: async () => null,
      listModules: async () => [],
      getModule: async () => null,
      saveProgress: async () => null,
    },
    assessment: {
      drawItems: async () => [],
      evaluate: async () => null,
    },
    passport: {
      get: async () => null,
      export: async () => null,
    },
    user: {
      exportGdpr: async () => null,
    },
    notification: {
      list: async () => [],
      markRead: async () => null,
    },
  };
}
