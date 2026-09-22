import { createDeferredResearchHandler } from '@/lib/research-automation';
import { hasAutomationSecret } from '@/lib/security';

// Keep existing timers compatible without starting paid research.
export const POST = createDeferredResearchHandler('discovery', hasAutomationSecret);
