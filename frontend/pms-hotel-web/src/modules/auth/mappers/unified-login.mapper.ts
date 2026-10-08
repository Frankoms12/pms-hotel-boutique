import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import type { UnifiedLoginDTO } from '../dtos/unified-login.dto';
import type { LoginResult } from '../model/unified-login';
export function mapUnifiedLogin(dto: UnifiedLoginDTO): LoginResult {
  if (dto.authenticated === true && (dto.context === 'STAFF' || dto.context === 'GUEST')) return { kind: 'authenticated', context: dto.context };
  if (dto.authenticated === false && dto.contexts?.length === 2 && dto.contexts.includes('STAFF') && dto.contexts.includes('GUEST')) return { kind: 'selection', contexts: ['STAFF', 'GUEST'] };
  throw new DomainMappingError('Invalid authentication response');
}
