import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vmcdruudzwettbtzqjbc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtY2RydXVkendldHRidHpxamJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMjIyNTYsImV4cCI6MjEwNDg5ODI1Nn0.OrVETGvpI35k4tR1ozRvyQVa-v3QeQ7eY-TsHNbJr4k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)