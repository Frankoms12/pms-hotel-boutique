package com.pms.hotelboutique.backend.infrastructure.security;
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
class UnifiedLoginMigrationIntegrationTests {
 @Autowired DataSource dataSource;
 private static final String MASTER="classpath:db/changelog/db.changelog-master.yaml";
 private static final String PREVIOUS="classpath:db/changelog/db.changelog-before-unified-login.yaml";
 private void migrate(Connection c,String schema,String path)throws Exception {
  c.setSchema(schema);
  var migration=new SpringLiquibase();migration.setDataSource(new SingleConnectionDataSource(c,true));migration.setDefaultSchema(schema);migration.setLiquibaseSchema(schema);migration.setChangeLog(path);migration.afterPropertiesSet();
 }
 private void sql(Connection c,String sql)throws Exception {try(var statement=c.createStatement()){statement.execute(sql);}}
 private Map<String,String> manifest(Connection c)throws Exception {
  Map<String,String> result=new TreeMap<>();try(var statement=c.createStatement();var rows=statement.executeQuery("SELECT id,md5sum FROM databasechangelog")){while(rows.next())result.put(rows.getString(1),rows.getString(2));}return result;
 }
 private void inSchema(Work work)throws Exception {
  String schema="auth_unified_"+UUID.randomUUID().toString().replace("-","");
  try(var c=dataSource.getConnection()) {c.setAutoCommit(true);sql(c,"CREATE SCHEMA "+schema);try{work.run(c,schema);}finally{c.setSchema("public");sql(c,"DROP SCHEMA "+schema+" CASCADE");}}
 }
 private interface Work{void run(Connection c,String schema)throws Exception;}
 @Test void cleanInstallHasCredentialForeignKeyAndNormalizedUniqueness()throws Exception {
  inSchema((c,schema)->{migrate(c,schema,MASTER);
   assertTrue(manifest(c).containsKey("003-auth-unified-password-009"));
   try(var stmt=c.createStatement();var rs=stmt.executeQuery("SELECT count(*) FROM guest_password_credentials")){rs.next();assertEquals(0,rs.getInt(1));}
   assertThrows(java.sql.SQLException.class,()->sql(c,"INSERT INTO guest_password_credentials VALUES('00000000-0000-4000-8000-000000000001','hash',now(),now())"));
  });
 }
 @Test void upgradePreservesAccountsHashesAndChecksumsAndIsIdempotent()throws Exception {
  inSchema((c,schema)->{migrate(c,schema,PREVIOUS);Map<String,String> before=manifest(c);
   sql(c,"INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES('00000000-0000-4000-8000-000000000002','GoogleOnly@Example.test',now(),'ACTIVE',now(),now())");
   migrate(c,schema,MASTER);var after=manifest(c);assertEquals(before.size()+4,after.size());before.forEach((id,checksum)->assertEquals(checksum,after.get(id)));
   try(var stmt=c.createStatement();var rs=stmt.executeQuery("SELECT email,(SELECT count(*) FROM guest_password_credentials) FROM guest_accounts WHERE id='00000000-0000-4000-8000-000000000002'")){assertTrue(rs.next());assertEquals("GoogleOnly@Example.test",rs.getString(1));assertEquals(0,rs.getInt(2));}
   migrate(c,schema,MASTER);assertEquals(after,manifest(c));
  });
 }
 @Test void staffAlreadyHasNormalizedUniquenessBeforeThisIncrement()throws Exception {
  inSchema((c,schema)->{migrate(c,schema,PREVIOUS);
   try(var stmt=c.createStatement();var rs=stmt.executeQuery("SELECT count(*) FROM pg_indexes WHERE schemaname='"+schema+"' AND indexname='uq_staff_users_work_email_normalized'")){rs.next();assertEquals(1,rs.getInt(1));}
  });
 }
 @Test void normalizedCollisionsFailUpgradeWithoutDeletingOrMergingIdentities()throws Exception {
  for(String table:List.of("guest_accounts"))inSchema((c,schema)->{
   migrate(c,schema,PREVIOUS);Map<String,String> before=manifest(c);
   for(String email:List.of("Duplicate@Example.test","duplicate@example.test")) {
    String id=UUID.randomUUID().toString();
    if(table.equals("staff_users"))sql(c,"INSERT INTO staff_users(id,username,work_email,password_hash,role_code,status,created_at,updated_at) VALUES('"+id+"','fixture-"+id+"','"+email+"','legacy-hash','RECEPCION','ACTIVE',now(),now())");
    else sql(c,"INSERT INTO guest_accounts(id,email,email_verified_at,status,created_at,updated_at) VALUES('"+id+"','"+email+"',now(),'ACTIVE',now(),now())");
   }
   assertThrows(Exception.class,()->migrate(c,schema,MASTER));
   assertEquals(before,manifest(c));try(var stmt=c.createStatement();var rs=stmt.executeQuery("SELECT count(*) FROM "+table)){rs.next();assertEquals(2,rs.getInt(1));}
  });
 }
}
