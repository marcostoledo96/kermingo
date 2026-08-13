export const API_URL_ENV_VAR = 'NEXT_PUBLIC_API_URL'
export const MOCK_API_ENV_VAR = 'NEXT_PUBLIC_MOCK_API'
export const API_URL_REQUIRED_ERROR = `${API_URL_ENV_VAR} es requerido en producción`

export const hasNonEmptyApiUrl = (apiUrl) => {
  return typeof apiUrl === 'string' && apiUrl.trim().length > 0
}

export const isMockApiEnabled = (mockApi = process.env[MOCK_API_ENV_VAR]) => {
  return mockApi === 'true'
}

export const assertProductionApiUrl = ({
  nodeEnv = process.env.NODE_ENV,
  apiUrl = process.env[API_URL_ENV_VAR],
  mockApi = process.env[MOCK_API_ENV_VAR],
} = {}) => {
  if (nodeEnv === 'production' && isMockApiEnabled(mockApi)) {
    return
  }
  if (nodeEnv === 'production' && !hasNonEmptyApiUrl(apiUrl)) {
    throw new Error(API_URL_REQUIRED_ERROR)
  }
}
