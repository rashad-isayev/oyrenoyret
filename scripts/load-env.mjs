import { config } from 'dotenv';

// Match Next.js development precedence without overriding variables supplied
// by the actual process or deployment environment.
config({ path: '.env.local' });
config({ path: '.env' });
