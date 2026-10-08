import {passwordLoginInput,passwordExceedsByteLimit} from '@/lib/login-input';
export type RegistrationField='email'|'password'|'confirmation';
export interface RegistrationValues {email:string;password:string;confirmation:string}
export function registrationErrors(v:RegistrationValues):Partial<Record<RegistrationField,string>>{
 const errors:Partial<Record<RegistrationField,string>>={};
 if(!passwordLoginInput(v.email,'validation-only'))errors.email='Ingresa un correo electrónico válido de hasta 50 caracteres.';
 if(v.password.length<8||v.password.length>50||! /\S/.test(v.password))errors.password='Usa entre 8 y 50 caracteres para tu contraseña.';
 else if(passwordExceedsByteLimit(v.password))errors.password='La contraseña supera 72 bytes UTF-8. Reduce los caracteres multibyte.';
 if(v.confirmation!==v.password||!v.confirmation)errors.confirmation='Las contraseñas no coinciden.';
 return errors;
}
