import axios from 'axios'
import { LokaliseProject, LokaliseLanguage, LokaliseKey, CreateKeyRequest, TranslateRequest } from '@/types/lokalise'

const LOKALISE_API_BASE = 'https://api.lokalise.com/api2'

class LokaliseAPI {
  private apiToken: string
  private projectId: string

  constructor(apiToken: string, projectId: string) {
    this.apiToken = apiToken
    this.projectId = projectId
  }

  private getHeaders() {
    return {
      'X-Api-Token': this.apiToken,
      'Content-Type': 'application/json',
    }
  }

  async getProject(): Promise<LokaliseProject> {
    const response = await axios.get(
      `${LOKALISE_API_BASE}/projects/${this.projectId}`,
      { headers: this.getHeaders() }
    )
    return response.data.project
  }

  async getLanguages(): Promise<LokaliseLanguage[]> {
    const response = await axios.get(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/languages`,
      { headers: this.getHeaders() }
    )
    return response.data.languages
  }

  async getKeys(): Promise<LokaliseKey[]> {
    const response = await axios.get(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/keys`,
      { 
        headers: this.getHeaders(),
        params: {
          include_translations: 1,
          limit: 100
        }
      }
    )
    return response.data.keys
  }

  async createKeys(keysData: CreateKeyRequest): Promise<LokaliseKey[]> {
    const response = await axios.post(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/keys`,
      keysData,
      { headers: this.getHeaders() }
    )
    return response.data.keys
  }

  async translateKeys(translateData: TranslateRequest): Promise<any> {
    const response = await axios.post(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/translations/translate`,
      translateData,
      { headers: this.getHeaders() }
    )
    return response.data
  }

  async updateTranslation(keyId: number, languageIso: string, translation: string): Promise<any> {
    console.log(`Creating/updating translation for key ${keyId} in language ${languageIso}: ${translation}`)
    try {
      // 새 번역 생성 (기존 번역이 있으면 덮어쓰기됨)
      const response = await axios.post(
        `${LOKALISE_API_BASE}/projects/${this.projectId}/translations`,
        { 
          translations: [{
            key_id: keyId,
            language_iso: languageIso,
            translation: translation,
            is_reviewed: false,
            is_fuzzy: false
          }]
        },
        { headers: this.getHeaders() }
      )
      console.log(`Translation creation/update successful for ${languageIso}:`, response.data)
      return response.data
    } catch (error: any) {
      console.error(`Translation creation/update failed for ${languageIso}:`, error.response?.data || error.message)
      throw error
    }
  }
}

export const createLokaliseClient = () => {
  const apiToken = process.env.LOKALISE_API_TOKEN
  const projectId = process.env.LOKALISE_PROJECT_ID

  if (!apiToken || !projectId) {
    throw new Error('Lokalise API token and project ID are required')
  }

  return new LokaliseAPI(apiToken, projectId)
}

export default LokaliseAPI