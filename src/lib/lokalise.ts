import axios from 'axios'
import { LokaliseProject, LokaliseLanguage, LokaliseKey, CreateKeyRequest, TranslateRequest, CreateScreenshotRequest, LokaliseScreenshot } from '@/types/lokalise'

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
    console.log('=== createKeys called ===')
    console.log('Original keysData:', JSON.stringify(keysData, null, 2))
    
    // Transform keysData to match Lokalise API format
    const transformedKeysData = {
      keys: keysData.keys.map(key => {
        console.log(`Processing key: ${key.key_name}`)
        console.log(`Platforms: ${key.platforms?.join(', ') || 'default'}`)
        
        const platforms = key.platforms || ['web', 'ios', 'android']
        
        const transformedKey = {
          key_name: key.key_name, // Keep as string - Lokalise API requirement
          description: key.description || '',
          platforms: platforms,
          tags: key.tags || [],
          translations: key.translations || []
        }
        
        console.log('Transformed key:', JSON.stringify(transformedKey, null, 2))
        return transformedKey
      })
    }
    
    console.log('Final request to Lokalise API:', JSON.stringify(transformedKeysData, null, 2))
    
    const response = await axios.post(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/keys`,
      transformedKeysData,
      { headers: this.getHeaders() }
    )
    
    console.log('Lokalise API response:', response.status, response.statusText)
    console.log('Response data:', JSON.stringify(response.data, null, 2))
    
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

  // 스크린샷 생성
  async createScreenshots(screenshotData: CreateScreenshotRequest): Promise<any> {
    console.log('=== createScreenshots called ===')
    console.log('Screenshot count:', screenshotData.screenshots.length)
    
    // Process screenshots (should already be base64 from client)
    const processedScreenshots = screenshotData.screenshots.map((screenshot, index) => {
      console.log(`Processing screenshot ${index}:`)
      console.log('- Data type:', typeof screenshot.data)
      console.log('- Data length:', screenshot.data.length)
      console.log('- Title:', screenshot.title)
      console.log('- Description:', screenshot.description)
      console.log('- Key IDs:', screenshot.key_ids)
      
      return {
        data: screenshot.data, // Should already be base64 data URL
        title: screenshot.title,
        description: screenshot.description,
        key_ids: screenshot.key_ids || [],
        ocr: false // Lokalise API parameter
      }
    })

    const requestBody = {
      screenshots: processedScreenshots
    }

    console.log('Making POST request to Lokalise screenshots API...')
    console.log('URL:', `${LOKALISE_API_BASE}/projects/${this.projectId}/screenshots`)
    console.log('Request body structure:', {
      screenshots: processedScreenshots.map(s => ({
        ...s,
        data: `${s.data.substring(0, 50)}...` // Log only first 50 chars of base64
      }))
    })
    
    try {
      const response = await axios.post(
        `${LOKALISE_API_BASE}/projects/${this.projectId}/screenshots`,
        requestBody,
        { 
          headers: this.getHeaders()
        }
      )
      console.log('Lokalise screenshots API response:', response.status, response.statusText)
      console.log('Response data:', response.data)
      return response.data
    } catch (error: any) {
      console.error('Lokalise screenshots API error:', error.response?.status, error.response?.statusText)
      console.error('Error response data:', error.response?.data)
      console.error('Error message:', error.message)
      throw error
    }
  }

  // 스크린샷 목록 조회
  async getScreenshots(): Promise<LokaliseScreenshot[]> {
    const response = await axios.get(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/screenshots`,
      { headers: this.getHeaders() }
    )
    return response.data.screenshots
  }

  // 특정 스크린샷 조회
  async getScreenshot(screenshotId: number): Promise<LokaliseScreenshot> {
    const response = await axios.get(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/screenshots/${screenshotId}`,
      { headers: this.getHeaders() }
    )
    return response.data.screenshot
  }

  // 스크린샷 삭제
  async deleteScreenshot(screenshotId: number): Promise<any> {
    const response = await axios.delete(
      `${LOKALISE_API_BASE}/projects/${this.projectId}/screenshots/${screenshotId}`,
      { headers: this.getHeaders() }
    )
    return response.data
  }

  // 키 생성과 스크린샷 업로드 통합 워크플로우
  async createKeysWithScreenshots(
    keysData: CreateKeyRequest, 
    screenshots?: CreateScreenshotRequest
  ): Promise<{keys: LokaliseKey[], screenshots?: any, screenshotError?: string}> {
    console.log('=== createKeysWithScreenshots called ===')
    console.log('Keys data:', JSON.stringify(keysData, null, 2))
    console.log('Screenshots provided:', !!screenshots)
    
    try {
      console.log('🔑 Creating keys with translations...')
      const keys = await this.createKeys(keysData)
      console.log('✅ Keys created successfully!')
      console.log(`📊 Created ${keys.length} key(s):`)
      keys.forEach((key, index) => {
        console.log(`  Key ${index + 1}: ID=${key.key_id}, Translations=${key.translations?.length || 0}`)
      })
      
      if (screenshots) {
        console.log('📸 Processing screenshots...')
        // 새로 생성된 키 ID를 스크린샷에 연결
        const keyIds = keys.map(key => key.key_id)
        console.log('🔗 Linking screenshots to key IDs:', keyIds)
        
        screenshots.screenshots.forEach((screenshot, index) => {
          if (!screenshot.key_ids || screenshot.key_ids.length === 0) {
            screenshot.key_ids = keyIds
          }
          console.log(`  📷 Screenshot ${index + 1} → Key IDs: [${screenshot.key_ids.join(', ')}]`)
          console.log(`      Title: "${screenshot.title}"`)
        })
        
        try {
          console.log('⬆️ Uploading screenshots to Lokalise API...')
          const screenshotResult = await this.createScreenshots(screenshots)
          console.log('✅ Screenshots uploaded successfully!')
          console.log('📊 Screenshot upload result:', screenshotResult)
          
          return { keys, screenshots: screenshotResult }
        } catch (screenshotError: any) {
          console.error('Screenshot upload failed:', screenshotError)
          console.warn('Continuing with keys only, screenshot upload failed')
          
          // Return keys with screenshot error info
          return { 
            keys, 
            screenshotError: `Screenshot upload failed: ${screenshotError.message}` 
          }
        }
      }
      
      console.log('No screenshots to upload, returning keys only')
      return { keys }
    } catch (error) {
      console.error('Error in createKeysWithScreenshots:', error)
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