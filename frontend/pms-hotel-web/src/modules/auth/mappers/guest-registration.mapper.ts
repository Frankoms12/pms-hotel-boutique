import {DomainMappingError} from '@/lib/errors/domain-mapping-error';
import type {GuestRegistrationAcceptedDTO,GuestRegistrationVerifiedDTO} from '../dtos/guest-registration.dto';
export function mapRegistrationAccepted(dto:GuestRegistrationAcceptedDTO){
 if(typeof dto?.requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.requestId))throw new DomainMappingError('INVALID_REGISTRATION_RESPONSE');
 return dto.requestId;
}
export function mapRegistrationVerified(dto:GuestRegistrationVerifiedDTO){if(dto?.authenticated!==true||dto.context!=='GUEST')throw new DomainMappingError('INVALID_REGISTRATION_RESPONSE');return true;}
