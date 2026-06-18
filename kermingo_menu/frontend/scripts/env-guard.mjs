export const API_URL_ENV_VAR = 'NEXT_PUBLIC_API_URL'
export const API_URL_REQUIRED_ERROR = `${API_URL_ENV_VAR} es requerido en producción`

export const hasNonEmptyApiUrl = (apiUrl) => {
  return typeof apiUrl === 'string' && apiUrl.trim().length > 0
}

export const assertProductionApiUrl = ({
  nodeEnv = process.env.NODE_ENV,
  apiUrl = process.env[API_URL_ENV_VAR],
} = {}) => {
  if (nodeEnv === 'production' && !hasNonEmptyApiUrl(apiUrl)) {
    throw new Error(API_URL_REQUIRED_ERROR)
  }
}
