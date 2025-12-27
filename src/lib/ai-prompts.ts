import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { AIPrompt, AIPromptKey, AIPromptVersion } from '@/types/ai-prompts'
import { DEFAULT_PROMPTS } from '@/types/ai-prompts'

// Create service client that bypasses RLS
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

// In-memory cache with TTL
interface CacheEntry {
  prompt: AIPrompt
  expires: number
}

const promptCache: Map<string, CacheEntry> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Get a single prompt by key (with caching)
 */
export async function getPrompt(key: AIPromptKey): Promise<AIPrompt | null> {
  // Check cache first
  const cached = promptCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.prompt
  }

  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('prompt_key', key)
      .eq('is_active', true)
      .single()

    if (error) {
      console.error(`Error fetching prompt ${key}:`, error)
      return null
    }

    if (data) {
      // Parse variables from JSONB to string array
      const prompt: AIPrompt = {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : []
      }
      promptCache.set(key, { prompt, expires: Date.now() + CACHE_TTL })
      return prompt
    }

    return null
  } catch (error) {
    console.error(`Error fetching prompt ${key}:`, error)
    return null
  }
}

/**
 * Get prompt content with variable substitution
 * Falls back to default prompts if DB is unavailable
 */
export async function getPromptContent(
  key: AIPromptKey,
  variables?: Record<string, string>
): Promise<string> {
  const prompt = await getPrompt(key)

  // Use DB content or fall back to default
  let content = prompt?.content || DEFAULT_PROMPTS[key]

  if (!content) {
    throw new Error(`Prompt not found and no default available: ${key}`)
  }

  // Replace template variables
  if (variables) {
    for (const [varName, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value)
    }
  }

  return content
}

/**
 * Get all prompts (for admin page)
 */
export async function getAllPrompts(): Promise<AIPrompt[]> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('prompt_key')

    if (error) {
      console.error('Error fetching all prompts:', error)
      return []
    }

    return (data || []).map(d => ({
      ...d,
      variables: Array.isArray(d.variables) ? d.variables : []
    })) as AIPrompt[]
  } catch (error) {
    console.error('Error fetching all prompts:', error)
    return []
  }
}

/**
 * Get prompts by category
 */
export async function getPromptsByCategory(category: string): Promise<AIPrompt[]> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('prompt_key')

    if (error) {
      console.error(`Error fetching prompts for category ${category}:`, error)
      return []
    }

    return (data || []).map(d => ({
      ...d,
      variables: Array.isArray(d.variables) ? d.variables : []
    })) as AIPrompt[]
  } catch (error) {
    console.error(`Error fetching prompts for category ${category}:`, error)
    return []
  }
}

/**
 * Get a single prompt by ID (for admin)
 */
export async function getPromptById(id: string): Promise<AIPrompt | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error(`Error fetching prompt by id ${id}:`, error)
      return null
    }

    if (data) {
      return {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : []
      } as AIPrompt
    }

    return null
  } catch (error) {
    console.error(`Error fetching prompt by id ${id}:`, error)
    return null
  }
}

/**
 * Update prompt (creates new version automatically)
 */
export async function updatePrompt(
  id: string,
  content: string,
  variables: string[],
  changeSummary: string | null,
  updatedBy: string
): Promise<AIPrompt | null> {
  try {
    const supabase = getServiceClient()

    // Get current prompt
    const { data: currentPrompt, error: fetchError } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentPrompt) {
      console.error('Error fetching current prompt:', fetchError)
      return null
    }

    const newVersion = currentPrompt.version + 1

    // Save current version to history
    const { error: versionError } = await supabase
      .from('ai_prompt_versions')
      .insert({
        prompt_id: id,
        version: currentPrompt.version,
        content: currentPrompt.content,
        variables: currentPrompt.variables,
        change_summary: changeSummary,
        created_by: updatedBy,
      })

    if (versionError) {
      console.error('Error saving version history:', versionError)
      // Continue anyway - version history is not critical
    }

    // Update prompt
    const { data: updatedPrompt, error: updateError } = await supabase
      .from('ai_prompts')
      .update({
        content,
        variables,
        version: newVersion,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating prompt:', updateError)
      return null
    }

    // Clear cache
    promptCache.delete(currentPrompt.prompt_key)

    return {
      ...updatedPrompt,
      variables: Array.isArray(updatedPrompt.variables) ? updatedPrompt.variables : []
    } as AIPrompt
  } catch (error) {
    console.error('Error updating prompt:', error)
    return null
  }
}

/**
 * Get version history for a prompt
 */
export async function getPromptVersions(promptId: string): Promise<AIPromptVersion[]> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version', { ascending: false })

    if (error) {
      console.error('Error fetching prompt versions:', error)
      return []
    }

    return (data || []).map(d => ({
      ...d,
      variables: Array.isArray(d.variables) ? d.variables : []
    })) as AIPromptVersion[]
  } catch (error) {
    console.error('Error fetching prompt versions:', error)
    return []
  }
}

/**
 * Rollback prompt to a specific version
 */
export async function rollbackPrompt(
  id: string,
  targetVersion: number,
  userId: string
): Promise<AIPrompt | null> {
  try {
    const supabase = getServiceClient()

    // Get target version
    const { data: targetVersionData, error: fetchError } = await supabase
      .from('ai_prompt_versions')
      .select('*')
      .eq('prompt_id', id)
      .eq('version', targetVersion)
      .single()

    if (fetchError || !targetVersionData) {
      console.error('Error fetching target version:', fetchError)
      return null
    }

    // Update with rollback content
    return updatePrompt(
      id,
      targetVersionData.content,
      Array.isArray(targetVersionData.variables) ? targetVersionData.variables : [],
      `버전 ${targetVersion}(으)로 롤백`,
      userId
    )
  } catch (error) {
    console.error('Error rolling back prompt:', error)
    return null
  }
}

/**
 * Clear all cached prompts (for admin operations)
 */
export function clearPromptCache(): void {
  promptCache.clear()
}

/**
 * Clear specific prompt from cache
 */
export function clearPromptFromCache(key: AIPromptKey): void {
  promptCache.delete(key)
}

/**
 * Get a single prompt by key (for admin operations, bypasses cache)
 */
export async function getPromptByKey(key: string): Promise<AIPrompt | null> {
  try {
    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('prompt_key', key)
      .single()

    if (error) {
      console.error(`Error fetching prompt by key ${key}:`, error)
      return null
    }

    if (data) {
      return {
        ...data,
        variables: Array.isArray(data.variables) ? data.variables : []
      } as AIPrompt
    }

    return null
  } catch (error) {
    console.error(`Error fetching prompt by key ${key}:`, error)
    return null
  }
}
