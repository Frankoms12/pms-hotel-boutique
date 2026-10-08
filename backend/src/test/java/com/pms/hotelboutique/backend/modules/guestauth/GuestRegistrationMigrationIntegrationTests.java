package com.pms.hotelboutique.backend.modules.guestauth;

import java.sql.Connection;
import java.util.*;
import javax.sql.DataSource;
import liquibase.integration.spring.SpringLiquibase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class GuestRegistrationMigrationIntegrationTests {
 @Autowired DataSource db;
 void migrate(Connection c,String schema,String path)throws Exception{
  c.setSchema(schema);var l=new SpringLiquibase();l.setDataSource(new SingleConnectionDataSource(c,true));l.setDefaultSchema(schema);l.setLiquibaseSchema(schema);l.setChangeLog(path);l.afterPropertiesSet();
 }
 Map<String,String> manifest(Connection c)throws Exception{var m=new TreeMap<String,String>();try(var st=c.createStatement();var rs=st.executeQuery("SELECT id,md5sum FROM databasechangelog")){while(rs.next())m.put(rs.getString(1),rs.getString(2));}return m;}
 void sql(Connection c,String s)throws Exception{try(var st=c.createStatement()){st.execute(s);}}
 void legacyLink(Connection c)throws Exception{
  String account="00000000-0000-4000-8000-000000000010",profile="00000000-0000-4000-8000-000000000011",session="00000000-0000-4000-8000-000000000012",reservation="00000000-0000-4000-8000-000000000013",challenge="00000000-0000-4000-8000-000000000014",property="3dcd0a8e-5c6a-46e7-8d51-7c95d86b232d";
  sql(c,"INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES('"+account+"','legacy@example.test',now(),'ACTIVE',now(),now())");
  sql(c,"INSERT INTO guest_profiles(id,property_id,first_name,last_name,email,status,created_at,updated_at) VALUES('"+profile+"','"+property+"','Legacy','Fixture','legacy@example.test','ACTIVE',now(),now())");
  sql(c,"INSERT INTO guest_auth_sessions(id,guest_account_id,status,created_at,expires_at) VALUES('"+session+"','"+account+"','ACTIVE',now(),now()+interval '1 hour')");
  sql(c,"INSERT INTO reservations(id,property_id,booking_guest_id,confirmation_code,status,currency,source_channel,created_at,updated_at) VALUES('"+reservation+"','"+property+"','"+profile+"','LEGACY-FIXTURE','PENDING','GTQ','WEB_DIRECTA',now(),now())");
  sql(c,"INSERT INTO reservation_link_challenges(id,guest_account_id,guest_session_id,reservation_id,property_id,booking_guest_profile_id,confirmation_fingerprint,status,issued_at,expires_at) VALUES('"+challenge+"','"+account+"','"+session+"','"+reservation+"','"+property+"','"+profile+"',repeat('a',64),'CONSUMED',now(),now())");
  sql(c,"INSERT INTO guest_reservation_links(reservation_id,guest_account_id,property_id,challenge_id,linked_at) VALUES('"+reservation+"','"+account+"','"+property+"','"+challenge+"',now())");
 }
 @Test void cleanAndUpgradePreserveHistoricalChecksumsAndEvidence()throws Exception{
  for(boolean upgrade:List.of(false,true))try(var c=db.getConnection()){
   String schema="reg_upgrade_"+UUID.randomUUID().toString().replace("-","");sql(c,"CREATE SCHEMA "+schema);
   try{
    Map<String,String> before=Map.of();
    if(upgrade){migrate(c,schema,"classpath:db/changelog/db.changelog-before-guest-registration.yaml");before=manifest(c);legacyLink(c);}
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(upgrade?before.size()+3:28,after.size());before.forEach((id,sum)->assertEquals(sum,after.get(id)));
    if(upgrade)try(var st=c.createStatement();var rs=st.executeQuery("SELECT link_source,challenge_id,email_verification_id FROM guest_reservation_links")){assertTrue(rs.next());assertEquals("RESERVATION_OTP",rs.getString(1));assertNotNull(rs.getObject(2));assertNull(rs.getObject(3));}
    sql(c,"INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES('00000000-0000-4000-8000-000000000001','Fixture@Example.test',now(),'ACTIVE',now(),now())");
    assertThrows(java.sql.SQLException.class,()->sql(c,"INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES('00000000-0000-4000-8000-000000000002',' fixture@example.test ',now(),'ACTIVE',now(),now())"));
    try(var st=c.createStatement();var rs=st.executeQuery("SELECT column_default FROM information_schema.columns WHERE table_schema='"+schema+"' AND table_name='guest_reservation_links' AND column_name='link_source'")){assertTrue(rs.next());assertTrue(rs.getString(1).contains("RESERVATION_OTP"));}
    try(var st=c.createStatement();var rs=st.executeQuery("SELECT is_nullable FROM information_schema.columns WHERE table_schema='"+schema+"' AND table_name='guest_reservation_links' AND column_name='challenge_id'")){assertTrue(rs.next());assertEquals("YES",rs.getString(1));}
    try(var st=c.createStatement();var rs=st.executeQuery("SELECT count(*) FROM pg_trigger WHERE tgrelid='guest_reservation_links'::regclass AND tgname='trg_guest_reservation_links_append_only'")){rs.next();assertEquals(1,rs.getInt(1));}
    assertThrows(java.sql.SQLException.class,()->sql(c,"INSERT INTO guest_email_verifications(id,guest_account_id,normalized_email,source,verified_at) VALUES('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','fixture@example.test','REGISTRATION',now())"));
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));
   }finally{c.setSchema("public");sql(c,"DROP SCHEMA "+schema+" CASCADE");}
  }
 }
 @Test void requestQuotaUpgradeCopiesPriorDeliveriesWithoutResending()throws Exception{
  try(var c=db.getConnection()){
   String schema="reg_quota_"+UUID.randomUUID().toString().replace("-","");sql(c,"CREATE SCHEMA "+schema);
   try{
    migrate(c,schema,"classpath:db/changelog/db.changelog-before-guest-registration.yaml");
    migrate(c,schema,"classpath:db/changelog/003ServiceSecurityAuth/010-guest-registration.yaml");
    migrate(c,schema,"classpath:db/changelog/004ServiceReservations/009-verified-email-history.yaml");
    var before=manifest(c);
    sql(c,"INSERT INTO guest_pending_registrations(id,email,email_fingerprint,binding_hash,status,created_at,expires_at,otp_expires_at) VALUES('00000000-0000-4000-8000-000000000021','legacy@example.test',repeat('a',64),repeat('b',64),'INVALID',now(),now()+interval '30 minutes',now()+interval '10 minutes')");
    sql(c,"INSERT INTO guest_registration_deliveries(id,registration_id,email_fingerprint,sent_at) VALUES('00000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000021',repeat('a',64),now())");
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");var after=manifest(c);assertEquals(before.size()+1,after.size());before.forEach((id,sum)->assertEquals(sum,after.get(id)));
    try(var st=c.createStatement();var rs=st.executeQuery("SELECT count(*) FROM guest_registration_request_events")){rs.next();assertEquals(1,rs.getInt(1));}
    migrate(c,schema,"classpath:db/changelog/db.changelog-master.yaml");assertEquals(after,manifest(c));
   }finally{c.setSchema("public");sql(c,"DROP SCHEMA "+schema+" CASCADE");}
  }
 }

}
