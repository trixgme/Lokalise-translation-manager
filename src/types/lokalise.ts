export interface LokaliseProject {
  project_id: string
  name: string
  description: string
  created_at: string
  created_by: number
  created_by_email: string
  team_id: number
}

export interface LokaliseLanguage {
  lang_id: number
  lang_iso: string
  lang_name: string
  is_rtl: boolean
  plural_forms: string[]
}

export interface LokaliseKey {
  key_id: number
  key_name: {
    ios: string
    android: string
    web: string
  }
  description: string
  platforms: string[]
  key_name_hash: string
  usage_count: number
  created_at: string
  modified_at: string
  translations: LokaliseTranslation[]
}

export interface LokaliseTranslation {
  translation_id: number
  key_id: number
  language_iso: string
  translation: string
  modified_at: string
  modified_by: number
  modified_by_email: string
  is_reviewed: boolean
  reviewed_by: number | null
  is_fuzzy: boolean
  is_unverified: boolean
}

export interface CreateKeyRequest {
  keys: {
    key_name: string
    description?: string
    platforms?: string[]
    tags?: string[]
    translations?: {
      language_iso: string
      translation: string
    }[]
  }[]
}

export interface TranslateRequest {
  source_lang_iso: string
  target_lang_isos: string[]
  keys: number[]
}

export interface CreateScreenshotRequest {
  screenshots: {
    data: string  // base64 data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
    title?: string
    description?: string
    key_ids?: number[]  // 연관된 키 ID들
  }[]
}

export interface LokaliseScreenshot {
  screenshot_id: number
  title: string
  description?: string
  screenshot_tags: string[]
  url: string
  created_at: string
  key_ids: number[]
}