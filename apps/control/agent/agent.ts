import {defineAgent} from 'eve';
export default defineAgent({model:'openai/gpt-6-luna-fast',reasoning:'high',defaultTools:false,tool:false,limits:{sessionUsage:({window})=>window.inputTokens>=80000||window.outputTokens>=8000,sessionTimeoutMs:24*60*60*1000}});
