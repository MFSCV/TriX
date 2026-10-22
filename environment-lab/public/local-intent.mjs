// Local mode offers explicit deterministic capabilities, not general language reasoning.
export function localIntent(prompt){
 const p=prompt.trim().toLowerCase().replace(/[?.!]+$/,'');
 if(/^(what (is|does|can) trix|how (does|do i use) trix|explain trix|help$|o que .*trix|para que .*trix)/.test(p))return 'about';
 if(/\b(team|specialist|subagent|equipa|especialidades)\b/.test(p))return 'team';
 if(/\b(evidence|activity|receipts?|evidencia|evidência)\b/.test(p))return 'activity';
 if(/\b(mcp|connections?|connect|ligações)\b/.test(p))return 'connections';
 if(/\b(audit|improve|deploy|implementation|implement|release|auditoria|melhorar|implementar)\b/.test(p))return 'audit';
 if(/\bcpu\b/.test(p)){
  if(/\b(do not|don't|never|não|nao)\b/.test(p))return 'reference';
  return /^(please )?(run|execute|executa|executar)\b/.test(p)?'cpu':'reference';
 }
 if(/^(please )?(generate|export|create|gera|gerar)\b/.test(p)&&/\b(configuration|configuração|configuracao|config|planning artifact)\b/.test(p))return 'generate';
 if(/^(please )?(validate|check|verify|valida|validar|verifica)\b/.test(p)&&/\b(environment|compatibility|ambiente|compatibilidade)\b/.test(p))return 'validate';
 if(/\b(compare|comparison|comparar)\b/.test(p)&&/\b(scenarios?|environments?|cenários|ambientes)\b/.test(p))return 'compare';
 if(/\b(workflow|fluxo)\b/.test(p))return 'workflow';
 if(/\b(environment|ambiente|hardware)\b/.test(p))return 'environment';
 return 'unavailable';
}
