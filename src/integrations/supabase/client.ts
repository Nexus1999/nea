import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lvekluteykquxyuyetdj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2ZWtsdXRleWtxdXh5dXlldGRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjU2NTgsImV4cCI6MjA4MDMwMTY1OH0.h9Uzqn9nSSPyn6wO7NF62HVL38WoH6C9JMcQqlvEZDc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);