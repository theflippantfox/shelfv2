import fs from 'fs';
const data = fs.readFileSync('/home/theflippantfox/Projects/shelf/supabase/migrations/0001_init.sql', 'utf8');
console.log(data.slice(0, 500));
