package com.pms.hotelboutique.backend.modules.guestauth.application;

import com.pms.hotelboutique.backend.modules.guestauth.domain.*;
import com.pms.hotelboutique.backend.infrastructure.security.PasswordLoginValidator;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.oidc.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.persistence.*;
import com.pms.hotelboutique.backend.modules.guestauth.infrastructure.security.GuestJwtService;
import java.nio.charset.StandardCharsets; import java.security.*; import java.time.*; import java.util.*;
import org.springframework.beans.factory.annotation.Value; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import org.springframework.web.util.UriComponentsBuilder;

@Service @Transactional public class GuestAuthServiceImpl implements GuestAuthService {
 private final VerifiedEmailHistoryService history;
 private final org.springframework.jdbc.core.simple.JdbcClient jdbc;
 private final PasswordLoginValidator loginInputs;
 private final GuestPasswordCredentialRepository credentials;
 private final org.springframework.security.crypto.password.PasswordEncoder encoder;
 private final String dummyHash;
 private final GuestAccountRepository accounts; private final GuestIdentityRepository identities; private final GuestAuthSessionRepository sessions; private final GuestRefreshTokenRepository refreshTokens; private final GuestOidcTransactionRepository transactions; private final GoogleOidcClient google; private final GuestJwtService jwt; private final Duration refreshTtl; private final String clientId; private final String redirectUri; private final SecureRandom random=new SecureRandom();
 public GuestAuthServiceImpl(VerifiedEmailHistoryService history,org.springframework.jdbc.core.simple.JdbcClient jdbc,GuestPasswordCredentialRepository credentials,org.springframework.security.crypto.password.PasswordEncoder encoder,GuestAccountRepository accounts,GuestIdentityRepository identities,GuestAuthSessionRepository sessions,GuestRefreshTokenRepository refreshTokens,GuestOidcTransactionRepository transactions,GoogleOidcClient google,GuestJwtService jwt,@Value("${pms.security.refresh-token-ttl:P7D}") Duration refreshTtl,@Value("${pms.google.client-id:}") String clientId,@Value("${pms.google.redirect-uri:}") String redirectUri,PasswordLoginValidator loginInputs){this.history=history;this.jdbc=jdbc;this.loginInputs=loginInputs;this.credentials=credentials;this.encoder=encoder;this.dummyHash=encoder.encode(UUID.randomUUID().toString());this.accounts=accounts;this.identities=identities;this.sessions=sessions;this.refreshTokens=refreshTokens;this.transactions=transactions;this.google=google;this.jwt=jwt;this.refreshTtl=refreshTtl;this.clientId=clientId;this.redirectUri=redirectUri;}
 @Override @Transactional(readOnly=true) public boolean acceptsCredentials(String email,String password) {
   GuestAccount account=accounts.findByNormalizedEmail(loginInputs.normalizedEmail(email,password)).orElse(null);
   GuestPasswordCredential credential=account==null?null:credentials.findById(account.getId()).orElse(null);
   boolean matched=encoder.matches(password,credential==null?dummyHash:credential.getPasswordHash());
   return matched && credential!=null && account.isActive();
 }
 @Override public GuestTokenPair login(String email,String password) {
   if(!acceptsCredentials(email,password)) throw new GuestAuthenticationException();
   GuestAccount account=accounts.findByNormalizedEmail(email.trim().toLowerCase(Locale.ROOT)).orElseThrow(GuestAuthenticationException::new);
   Instant now=Instant.now(); account.recordLogin(now);
   return tokens(sessions.save(new GuestAuthSession(UUID.randomUUID(),account,now.plus(refreshTtl),now)),UUID.randomUUID(),now);
 }
 @Override public String startGoogleAuthorization(){ if(blank(clientId)||blank(redirectUri)) throw new IllegalStateException("Google OIDC deployment configuration is required"); Instant now=Instant.now(); String state=randomUrlValue(),nonce=randomUrlValue(),verifier=randomUrlValue(); transactions.save(new GuestOidcTransaction(UUID.randomUUID(),hash(state),nonce,verifier,now.plus(Duration.ofMinutes(10)),now)); String challenge=base64Url(sha256Bytes(verifier)); return UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth").queryParam("client_id",clientId).queryParam("redirect_uri",redirectUri).queryParam("response_type","code").queryParam("scope","openid email").queryParam("state",state).queryParam("nonce",nonce).queryParam("code_challenge",challenge).queryParam("code_challenge_method","S256").build().encode().toUriString(); }
 @Override public GuestTokenPair exchangeGoogleAuthorization(String code,String state){ if(blank(code)||blank(state))throw new GuestAuthenticationException(); Instant now=Instant.now(); GuestOidcTransaction tx=transactions.findByStateHash(hash(state)).orElseThrow(GuestAuthenticationException::new); if(!tx.isUsable(now))throw new GuestAuthenticationException(); VerifiedGoogleIdentity googleIdentity=google.exchange(code,tx.getPkceVerifier(),tx.getNonce()); tx.use(now); GuestAccount account=identities.findByProviderAndProviderSubject("GOOGLE",googleIdentity.subject()).map(GuestIdentity::getGuestAccount).orElseGet(()->createAccount(googleIdentity,now)); if(!account.isActive())throw new GuestAuthenticationException(); account.recordLogin(now); GuestAuthSession session=sessions.save(new GuestAuthSession(UUID.randomUUID(),account,now.plus(refreshTtl),now)); return tokens(session,UUID.randomUUID(),now); }
 @Override public GuestTokenPair refresh(String raw){if(blank(raw))throw new GuestAuthenticationException(); Instant now=Instant.now(); GuestRefreshToken current=refreshTokens.findByTokenHash(hash(raw)).orElseThrow(GuestAuthenticationException::new); GuestAuthSession session=current.getSession(); if(!current.isActive(now)||!session.isActive(now)||!session.getGuestAccount().isActive()){revoke(session,now);throw new GuestAuthenticationException();} current.revoke(now);return tokens(session,current.getFamilyId(),now);}
 @Override @Transactional(readOnly=true) public GuestPrincipal getActivePrincipal(GuestPrincipal principal){Instant now=Instant.now();GuestAuthSession session=sessions.findById(principal.sessionId()).orElseThrow(GuestAuthenticationException::new);if(!session.isActive(now)||!session.getGuestAccount().isActive()||!session.getGuestAccount().getId().equals(principal.guestAccountId()))throw new GuestAuthenticationException();return new GuestPrincipal(principal.guestAccountId(),principal.sessionId(),session.getGuestAccount().getEmail());}
 @Override public void logout(GuestPrincipal principal){revoke(sessions.findById(principal.sessionId()).orElseThrow(GuestAuthenticationException::new),Instant.now());}
 private GuestAccount createAccount(VerifiedGoogleIdentity identity,Instant now){
   jdbc.sql("SELECT pg_advisory_xact_lock(73101,hashtext(:email))").param("email",identity.email()).query(rs->{rs.next();return true;});
   // A concurrent callback may have created the subject while this transaction waited.
   var existing=identities.findByProviderAndProviderSubject("GOOGLE",identity.subject());
   if(existing.isPresent()) return existing.get().getGuestAccount();
   if(accounts.findByNormalizedEmail(identity.email()).isPresent()) throw new GuestAuthenticationException();
   GuestAccount account=accounts.saveAndFlush(new GuestAccount(UUID.randomUUID(),identity.email(),now));
   identities.saveAndFlush(new GuestIdentity(UUID.randomUUID(),account,"GOOGLE",identity.subject(),now));
   history.verifyAndLink(account.getId(),null);return account;
 }
 @Override public GuestTokenPair createVerifiedSession(UUID accountId) {
   GuestAccount account=accounts.findById(accountId).filter(GuestAccount::isActive).orElseThrow(GuestAuthenticationException::new);
   if(!account.isEmailVerified()) throw new GuestAuthenticationException();
   Instant now=Instant.now();account.recordLogin(now);
   return tokens(sessions.save(new GuestAuthSession(UUID.randomUUID(),account,now.plus(refreshTtl),now)),UUID.randomUUID(),now);
 }
 private GuestTokenPair tokens(GuestAuthSession session,UUID family,Instant now){String raw=randomToken();refreshTokens.save(new GuestRefreshToken(UUID.randomUUID(),session,hash(raw),family,now.plus(refreshTtl),now));GuestPrincipal p=new GuestPrincipal(session.getGuestAccount().getId(),session.getId(),session.getGuestAccount().getEmail());return new GuestTokenPair(jwt.issue(p,now),raw,jwt.accessTokenExpiresInSeconds());}
 private void revoke(GuestAuthSession session,Instant now){if(session.isActive(now))session.revoke(now);refreshTokens.findAllBySession_Id(session.getId()).forEach(token->token.revoke(now));}
 private String randomUrlValue(){byte[] b=new byte[48];random.nextBytes(b);return base64Url(b);} private String randomToken(){return randomUrlValue();} private String hash(String value){return java.util.HexFormat.of().formatHex(sha256Bytes(value));} private byte[] sha256Bytes(String value){return sha256Bytes(value.getBytes(StandardCharsets.UTF_8));} private byte[] sha256Bytes(byte[] value){try{return MessageDigest.getInstance("SHA-256").digest(value);}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}} private String base64Url(byte[] bytes){return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);} private boolean blank(String value){return value==null||value.isBlank();}
}
