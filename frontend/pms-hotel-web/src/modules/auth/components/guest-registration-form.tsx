'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {registrationErrors,type RegistrationField} from '../model/guest-registration';
import {useGuestRegistration} from '../hooks/use-guest-registration';
import {AuthPasswordField} from './auth-password-field';
import {Button} from '@/shared/components';
import styles from './guest-access-page.module.css';
const notices={invalidOtp:'No pudimos verificar el código. Compruébalo; puede haber expirado o alcanzado el límite de intentos.',expired:'Este proceso no está disponible. Inicia un nuevo registro.',rateLimited:'Has alcanzado el límite temporal. Espera antes de reintentar.',unavailable:'El registro no está disponible en este momento. Inténtalo de nuevo.'};
export function GuestRegistrationForm({pendingRequestId,onBusyChange,onLogin}:{pendingRequestId?:string;onBusyChange?:(busy:boolean)=>void;onLogin?:(email:string)=>void}){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [confirmation,setConfirmation]=useState('');const [otp,setOtp]=useState('');
 const [submitted,setSubmitted]=useState(false);const [touched,setTouched]=useState<Partial<Record<RegistrationField,boolean>>>({});
 const registration=useGuestRegistration(pendingRequestId);const form=useRef<HTMLFormElement>(null);
 const errors=registrationErrors({email,password,confirmation});
 useEffect(()=>{onBusyChange?.(registration.busy);},[onBusyChange,registration.busy]);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 async function submit(event:FormEvent){event.preventDefault();setSubmitted(true);
  const field=(['email','password','confirmation'] as const).find(k=>errors[k]);
  if(field){form.current?.querySelector<HTMLInputElement>(`#auth-${field}`)?.focus();return;}
  setSubmitted(false);setTouched({});
  const attempt=registration.register(email,password);setPassword('');setConfirmation('');await attempt;
 }
 function back(){setPassword('');setConfirmation('');setOtp('');setSubmitted(false);setTouched({});registration.back();}
 const error=(field:RegistrationField)=>(submitted||touched[field])?errors[field]:undefined;
 const notice=registration.phase in notices?notices[registration.phase as keyof typeof notices]:null;
 if(registration.requestId)return <section className={styles.otpPanel} aria-label="Verificar correo" aria-busy={registration.busy}>
  <h2>Revisa tu correo</h2><p>Si podemos continuar con este correo, recibirás instrucciones para verificarlo. Si ya tienes una cuenta, inicia sesión con tu método habitual.</p>
  <form className={styles.credentialsForm} onSubmit={event=>{event.preventDefault();const value=otp;setOtp('');void registration.verify(value);}}>
   <div className={styles.field}><label htmlFor="registration-otp">Código de verificación</label><input id="registration-otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" minLength={8} maxLength={8} required value={otp} onChange={event=>setOtp(event.target.value)} disabled={registration.busy}/></div>
   <Button className={styles.action} disabled={registration.busy||! /^[0-9]{8}$/.test(otp)} isLoading={registration.phase==='verifying'} loadingText="Verificando…" type="submit">Verificar código</Button>
  </form>
  <Button variant="ghost" className={styles.action} type="button" isLoading={registration.phase==='resending'} loadingText="Reenviando…" disabled={registration.busy||now<registration.resendAt} onClick={()=>{setOtp('');void registration.resend();}}>Reenviar código</Button>
  {now<registration.resendAt&&<p role="status">Podrás reenviar en {Math.ceil((registration.resendAt-now)/1000)} segundos.</p>}
  <Button variant="outline" className={styles.action} type="button" disabled={registration.busy} onClick={()=>{back();onLogin?.(email);}}>Ir a iniciar sesión</Button>
  <Button variant="outline" className={styles.action} type="button" disabled={registration.busy} onClick={back}>Volver</Button>
  {notice&&<p role="alert">{notice}</p>}{registration.phase==='success'&&<p role="status">Correo verificado. Abriendo tu cuenta…</p>}
 </section>;
 return <form ref={form} className={styles.credentialsForm} onSubmit={event=>void submit(event)} noValidate aria-label="Crear cuenta con correo" aria-busy={registration.busy}>
  <div className={styles.field}><label htmlFor="auth-email">Correo electrónico</label>
   <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={50} value={email} onChange={event=>setEmail(event.target.value)} onBlur={()=>setTouched(v=>({...v,email:true}))} disabled={registration.busy} aria-invalid={!!error('email')}/>
   {error('email')&&<p role="alert">{error('email')}</p>}</div>
  <AuthPasswordField id="auth-password" label="Contraseña" value={password} onChange={setPassword} onBlur={()=>setTouched(v=>({...v,password:true}))} error={error('password')} disabled={registration.busy} autoComplete="new-password"/>
  <AuthPasswordField id="auth-confirmation" label="Confirmar contraseña" value={confirmation} onChange={setConfirmation} onBlur={()=>setTouched(v=>({...v,confirmation:true}))} error={error('confirmation')} disabled={registration.busy} autoComplete="new-password"/>
  <p>Usa entre 8 y 50 caracteres y un máximo de 72 bytes UTF-8. Tu contraseña se conserva exactamente como la escribes.</p>
  <Button className={styles.action} disabled={registration.busy} isLoading={registration.phase==='submitting'} loadingText="Enviando…" type="submit">Crear mi cuenta</Button>
  {notice&&<p role="alert">{notice}</p>}
 </form>;
}
