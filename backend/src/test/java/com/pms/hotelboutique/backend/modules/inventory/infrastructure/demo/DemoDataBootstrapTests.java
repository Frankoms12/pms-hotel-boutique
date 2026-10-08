package com.pms.hotelboutique.backend.modules.inventory.infrastructure.demo;

import com.pms.hotelboutique.backend.modules.inventory.application.DemoRatePolicy;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DemoDataBootstrapTests {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private ApplicationContextRunner context(String enabled, String... profiles) {
        return new ApplicationContextRunner().withUserConfiguration(DemoDataBootstrap.class)
                .withBean(org.springframework.security.crypto.password.PasswordEncoder.class, () -> mock(org.springframework.security.crypto.password.PasswordEncoder.class))
                .withBean(JdbcTemplate.class, () -> jdbc).withBean(DemoRatePolicy.class, DemoRatePolicy::new)
                .withInitializer(ctx -> ctx.getEnvironment().setActiveProfiles(profiles))
                .withPropertyValues("pms.demo.data.enabled=" + enabled);
    }
    @Test void enabledDemoRegistersBootstrap() { context("true", "demo").run(ctx -> assertThat(ctx).hasSingleBean(DemoDataBootstrap.class)); }
    @Test void enabledDevRegistersBootstrap() { context("true", "dev").run(ctx -> assertThat(ctx).hasSingleBean(DemoDataBootstrap.class)); }
    @Test void disabledDemoDoesNotRegisterOrWrite() {
        context("false", "demo").run(ctx -> assertThat(ctx).doesNotHaveBean(DemoDataBootstrap.class)); verify(jdbc, atLeastOnce()).afterPropertiesSet(); verifyNoMoreInteractions(jdbc);
    }
    @Test void enabledFlagWithoutLocalProfileDoesNotRegister() {
        context("true").run(ctx -> assertThat(ctx).doesNotHaveBean(DemoDataBootstrap.class)); verify(jdbc, atLeastOnce()).afterPropertiesSet(); verifyNoMoreInteractions(jdbc);
    }
    @Test void productionProfilesBlockEvenWhenDemoAndFlagArePresent() {
        for (String profile : new String[] {"prod", "production"}) context("true", "demo", profile).run(ctx -> assertThat(ctx).doesNotHaveBean(DemoDataBootstrap.class));
        verify(jdbc, atLeastOnce()).afterPropertiesSet(); verifyNoMoreInteractions(jdbc);
    }
}
