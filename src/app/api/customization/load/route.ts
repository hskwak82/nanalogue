import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type {
  CoverTemplate,
  PaperTemplate,
  DecorationItem,
  DiaryCustomization,
  PlacedDecoration,
  CustomizationLoadResponse,
} from '@/types/customization'
import { SPINE_WIDTH_RATIO } from '@/types/diary'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const diaryId = searchParams.get('diaryId')

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch templates, items, and subscription status
    const [
      profileResult,
      coverTemplatesResult,
      paperTemplatesResult,
      decorationItemsResult,
      subscriptionResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('cover_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('paper_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('decoration_items')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order'),
      supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('user_id', user.id)
        .single(),
    ])

    // Check if user has premium subscription
    const subscription = subscriptionResult.data
    const isPremium = subscription?.plan === 'pro' &&
      subscription?.status === 'active' &&
      (!subscription?.current_period_end || new Date(subscription.current_period_end) > new Date())

    // Load diary customization (from diaries table or fallback to diary_customization)
    let customization: DiaryCustomization | null = null
    let currentDiaryId: string | null = null

    if (diaryId) {
      // Load specific diary
      const { data: diary } = await supabase
        .from('diaries')
        .select('*')
        .eq('id', diaryId)
        .eq('user_id', user.id)
        .single()

      if (diary) {
        currentDiaryId = diary.id
        customization = {
          id: diary.id,
          user_id: diary.user_id,
          cover_template_id: diary.cover_template_id,
          paper_template_id: diary.paper_template_id,
          cover_decorations: (diary.cover_decorations || []) as PlacedDecoration[],
          paper_decorations: (diary.paper_decorations || []) as PlacedDecoration[],
          paper_opacity: diary.paper_opacity ?? 1.0,
          paper_font_family: diary.paper_font_family ?? 'default',
          paper_font_color: diary.paper_font_color ?? '#333333',
          created_at: diary.created_at,
          updated_at: diary.updated_at,
        }
      }
    } else {
      // Load active diary first, then fallback to diary_customization
      const { data: activeDiary } = await supabase
        .from('diaries')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('volume_number', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeDiary) {
        currentDiaryId = activeDiary.id
        customization = {
          id: activeDiary.id,
          user_id: activeDiary.user_id,
          cover_template_id: activeDiary.cover_template_id,
          paper_template_id: activeDiary.paper_template_id,
          cover_decorations: (activeDiary.cover_decorations || []) as PlacedDecoration[],
          paper_decorations: (activeDiary.paper_decorations || []) as PlacedDecoration[],
          paper_opacity: activeDiary.paper_opacity ?? 1.0,
          paper_font_family: activeDiary.paper_font_family ?? 'default',
          paper_font_color: activeDiary.paper_font_color ?? '#333333',
          created_at: activeDiary.created_at,
          updated_at: activeDiary.updated_at,
        }
      } else {
        // Fallback to old diary_customization table
        const { data: oldCustomization } = await supabase
          .from('diary_customization')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (oldCustomization) {
          customization = {
            ...oldCustomization,
            cover_decorations: (oldCustomization.cover_decorations || []) as PlacedDecoration[],
            paper_decorations: (oldCustomization.paper_decorations || []) as PlacedDecoration[],
            paper_opacity: oldCustomization.paper_opacity ?? 1.0,
            paper_font_family: oldCustomization.paper_font_family ?? 'default',
            paper_font_color: oldCustomization.paper_font_color ?? '#333333',
          }
        }
      }
    }

    // Check for errors
    if (coverTemplatesResult.error) {
      console.error('Error fetching cover templates:', coverTemplatesResult.error)
    }
    if (paperTemplatesResult.error) {
      console.error('Error fetching paper templates:', paperTemplatesResult.error)
    }
    if (decorationItemsResult.error) {
      console.error('Error fetching decoration items:', decorationItemsResult.error)
    }

    const response: CustomizationLoadResponse & {
      diaryId?: string
      isPremium?: boolean
      coverImageUrl?: string | null
      spinePosition?: number
      spineWidth?: number
      spinePresetId?: string | null
    } = {
      user: {
        id: user.id,
        email: user.email || '',
        name: profileResult.data?.name || null,
      },
      customization,
      coverTemplates: (coverTemplatesResult.data || []) as CoverTemplate[],
      paperTemplates: (paperTemplatesResult.data || []) as PaperTemplate[],
      decorationItems: (decorationItemsResult.data || []) as DecorationItem[],
      diaryId: currentDiaryId || undefined,
      isPremium,
      coverImageUrl: null, // Will be set from diary data
    }

    // If we have a diary, get the cover_image_url, spine settings directly from it
    if (diaryId) {
      const { data: diaryForImage } = await supabase
        .from('diaries')
        .select('cover_image_url, spine_position, spine_width, spine_preset_id')
        .eq('id', diaryId)
        .single()

      if (diaryForImage) {
        response.coverImageUrl = diaryForImage.cover_image_url
        response.spinePosition = diaryForImage.spine_position ?? 0
        response.spineWidth = diaryForImage.spine_width ?? SPINE_WIDTH_RATIO
        response.spinePresetId = diaryForImage.spine_preset_id ?? null
      }
    } else if (currentDiaryId) {
      const { data: diaryForImage } = await supabase
        .from('diaries')
        .select('cover_image_url, spine_position, spine_width, spine_preset_id')
        .eq('id', currentDiaryId)
        .single()

      if (diaryForImage) {
        response.coverImageUrl = diaryForImage.cover_image_url
        response.spinePosition = diaryForImage.spine_position ?? 0
        response.spineWidth = diaryForImage.spine_width ?? SPINE_WIDTH_RATIO
        response.spinePresetId = diaryForImage.spine_preset_id ?? null
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error loading customization:', error)
    return NextResponse.json(
      { error: 'Failed to load customization' },
      { status: 500 }
    )
  }
}
