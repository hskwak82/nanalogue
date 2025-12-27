import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// Check diary entries with session_id
const { data: diaryEntries } = await supabase
  .from('diary_entries')
  .select('entry_date, session_id')
  .not('session_id', 'is', null)
  .order('entry_date', { ascending: false })
  .limit(5);

console.log('📖 Diary entries with session_id:');
if (diaryEntries) {
  diaryEntries.forEach(e => console.log('  - ' + e.entry_date + ' -> session: ' + e.session_id));
}

// Check if those sessions have images
if (diaryEntries && diaryEntries.length > 0) {
  const sessionIds = diaryEntries.map(e => e.session_id);

  const { data: sessions, error } = await supabase
    .from('daily_sessions')
    .select('id, session_date, session_image_url')
    .in('id', sessionIds)
    .not('session_image_url', 'is', null);

  console.log('\n📷 Sessions with images (from diary entries):');
  if (error) {
    console.log('Error:', error);
  } else if (sessions && sessions.length > 0) {
    sessions.forEach(s => {
      const url = s.session_image_url || '';
      console.log('  - ' + s.session_date + ': ' + url.substring(0, 60) + '...');
    });
  } else {
    console.log('  No sessions with images found');
  }
}
